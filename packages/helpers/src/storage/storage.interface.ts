import { IO } from '../io'
import { Logger } from '../logger'

/**
 * Represents the constructor options for a storage.
 */
export interface StorageConstructor {
    /**
     * The name of the storage.
     */
    name: string
    /**
     * The root path of the storage.
     */
    root: string
    /**
     * Late initialization flag.
     *
     * - `true` : The storage will not be initialized immediately.
     * - `false` : The storage will be initialized immediately.
     */
    lateInit?: boolean
}

/**
 * Represents an abstract storage interface.
 * @template Schema - The type of data stored in the storage.
 */
export abstract class StorageInterface<Schema> {
    protected readonly $io: IO
    protected readonly $logger: Logger
    protected constructor(protected readonly options: StorageConstructor) {
        if (!options.name || !options.root) {
            throw new Error('Invalid storage options provided.')
        }
        this.$io = new IO()
        this.$logger = new Logger({
            name: options.name,
        })
        if (!options.lateInit) {
            this.checkStorageExistence(options.root)
        }
    }

    /**
     * Initializes the storage.
     */
    public async init(): Promise<void> {
        await this.checkStorageExistence(this.options.root)
    }

    /**
     * Update root path of storage
     * @param root new root path
     */
    public updateRoot(root: string): void {
        this.options.root = root
        this.checkStorageExistence(root)
    }

    private async checkStorageExistence(root: string): Promise<void> {
        this.$io.reader.fileExists(root).then((exists) => {
            if (!exists) {
                this.$logger.warn('Storage file does not exist.')
                this.$io.writer
                    .write({
                        data: '{}',
                        filePath: root,
                    })
                    .then(() => {
                        this.$logger.info('Storage file created.')
                    })
            } else {
                this.load().catch((error) => this.$logger.error(error))
            }
        })
    }

    /**
     * Loads the data from the storage file.
     * @throws {StorageError} If there is an error loading the storage file.
     */
    public abstract load(): Promise<void>

    /**
     * Retrieves the value associated with the specified key from the storage.
     * @param key - The key to retrieve the value for.
     * @returns A promise that resolves to the value associated with the key, or undefined if the key does not exist.
     */
    public abstract get(key: string): Schema | undefined

    /**
     * Sets the value associated with the specified key in the storage.
     * @param key - The key to set the value for.
     * @param value - The value to be stored.
     * @returns A promise that resolves when the value is set.
     */
    public abstract set(key: string, value: Schema): Promise<void>

    /**
     * Removes the value associated with the specified key from the storage.
     * @param key - The key to remove the value for.
     * @returns A promise that resolves when the value is removed.
     */
    public abstract remove(key: string): Promise<void>

    /**
     * Clears all values from the storage.
     * @returns A promise that resolves when the storage is cleared.
     */
    public abstract reset(): Promise<void>

    /**
     * Saves the current state of the storage.
     * @returns A promise that resolves when the state is saved.
     */
    public abstract save(): Promise<void>
}
