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
    }

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
    public abstract clear(): Promise<void>

    /**
     * Saves the current state of the storage.
     * @returns A promise that resolves when the state is saved.
     */
    public abstract save(): Promise<void>
}
