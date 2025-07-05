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
    private _initialized: boolean = false

    /**
     * Underlying storage represented as a Map.
     */
    protected _storage: Map<string, Schema> = new Map<string, Schema>()

    /**
     * Constructs a new instance of the storage interface.
     *
     * @param {StorageConstructor} options - The options for the storage.
     * @param {string} options.name - The name of the storage.
     * @param {string} options.root - The root path of the storage.
     * @throws {Error} Throws an error if invalid storage options are provided.
     */
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
     * Gets the underlying storage `Map`.
     */
    public get storage(): Map<string, Schema> {
        return this._storage
    }

    /**
     * Gets the underlying storage as `Record`.
     */
    public get storageRecord(): Record<string, Schema> {
        return Object.fromEntries(this._storage)
    }

    /**
     * Ensures that the storage is initialized before any operation.
     *
     * @returns {Promise<void>} A promise that resolves when initialization is complete.
     * @protected
     */
    protected async ensureInitialized(): Promise<void> {
        if (!this._initialized) {
            await this.init()
        }
    }

    /**
     * Initializes the storage.
     * @param initTemplateData - The initial data to use when creating a new storage file. Default is an empty object.
     * @returns {Promise<void>} A promise that resolves when initialization is complete.
     */
    public async init(initTemplateData: string = '{}'): Promise<void> {
        if (this._initialized) return

        const rootExists = await this.$io.reader.checkExists(this.options.root)
        if (rootExists) {
            await this.load()
        } else {
            this.$logger.info(
                'Storage file does not exist. Creating new storage.'
            )
            const created = await this.$io.writer.write({
                data: initTemplateData,
                filePath: this.options.root,
            })
            if (created.success) {
                this.$logger.info('Storage file created successfully.')
            } else {
                this.$logger.error(
                    `Failed to create storage file. Error: ${JSON.stringify(created.error)}`
                )
            }
        }

        this._initialized = true
    }

    /**
     * Migrates the storage to a new root path.
     * @param to - The new root path.
     */
    private async migrateStorage(to: string): Promise<void> {
        this.options.root = to
        this.$logger.info(`Migrating storage to new path: ${to}`)

        this._initialized = false
        await this.init()
        await this.save()
    }

    /**
     * Updates the root path of the storage, optionally retaining the previous storage file.
     * @param root - The new root path.
     * @param keepPrevDB - Whether to keep the previous storage file. Default is `false`.
     */
    public async updateRoot(
        root: string,
        keepPrevDB: boolean = false
    ): Promise<void> {
        await this.ensureInitialized()

        if (this.options.root === root) {
            this.$logger.info(
                'New root path is the same as the current path. Skipping update.'
            )
            return
        }

        const previousRoot = this.options.root

        await this.migrateStorage(root)

        if (!keepPrevDB) {
            const previousRootExists =
                await this.$io.reader.checkExists(previousRoot)

            if (previousRootExists) {
                const deletionResult =
                    await this.$io.writer.deleteFile(previousRoot)
                if (deletionResult.success) {
                    this.$logger.info(
                        'Previous storage file deleted successfully.'
                    )
                } else {
                    this.$logger.error(
                        `Failed to delete previous storage file. Error: ${JSON.stringify(deletionResult.error, null, 2)}`
                    )
                }
            }
        }
    }

    /**
     * Retrieves the value associated with the specified key from the storage.
     *
     * @param {string} key - The key to retrieve the value for.
     * @returns {Promise<Schema | undefined>} A promise that resolves to the value associated with the key, or `undefined` if the key does not exist.
     */
    public get(key: string): Schema | undefined {
        try {
            return this._get(key)
        } catch (error) {
            this.$logger.error(
                `Error retrieving value for key ${key}: ${error}`
            )
            throw error
        }
    }

    /**
     * Sets the value associated with the specified key in the storage.
     *
     * @param {string} key - The key to set the value for.
     * @param {Schema} value - The value to be stored.
     * @returns {Promise<void>} A promise that resolves when the value is set.
     */
    public async set(key: string, value: Schema): Promise<void> {
        await this.ensureInitialized()
        try {
            await this._set(key, value)
        } catch (error) {
            this.$logger.error(`Error setting value for key ${key}: ${error}`)
            throw error
        }
    }

    /**
     * Removes the value associated with the specified key from the storage.
     *
     * @param {string} key - The key to remove the value for.
     * @returns {Promise<void>} A promise that resolves when the value is removed.
     */
    public async remove(key: string): Promise<void> {
        await this.ensureInitialized()
        try {
            await this._remove(key)
        } catch (error) {
            this.$logger.error(`Error removing value for key ${key}: ${error}`)
            throw error
        }
    }

    /**
     * Clears all values from the storage.
     *
     * @returns {Promise<void>} A promise that resolves when the storage is cleared.
     */
    public async reset(): Promise<void> {
        await this.ensureInitialized()
        try {
            await this._reset()
        } catch (error) {
            this.$logger.error(
                `Error resetting storage: ${JSON.stringify(error, null, 2)}`
            )
            throw error
        }
    }

    /**
     * Saves the current state of the storage.
     *
     * @returns {Promise<void>} A promise that resolves when the state is saved.
     */
    public async save(): Promise<void> {
        await this.ensureInitialized()
        try {
            await this._save()
        } catch (error) {
            this.$logger.error(
                `Error saving storage: ${JSON.stringify(error, null, 3)}`
            )
            throw error
        }
    }

    /**
     * Loads the data from the storage file.
     *
     * This method is called during the initialization process if the storage file already exists.
     * Subclasses must implement this method to define how the data is loaded from the storage file.
     *
     * @returns {Promise<void>} A promise that resolves when the data is loaded.
     * @abstract
     */
    protected abstract load(): Promise<void>

    /**
     * Retrieves the value associated with the specified key from the storage.
     *
     * Subclasses must implement this method to define how the value is retrieved.
     *
     * @param {string} key - The key to retrieve the value for.
     * @returns {Schema | undefined} A promise that resolves to the value associated with the key, or `undefined` if the key does not exist.
     * @abstract
     */
    protected abstract _get(key: string): Schema | undefined

    /**
     * Sets the value associated with the specified key in the storage.
     *
     * Subclasses must implement this method to define how the value is stored.
     *
     * @param {string} key - The key to set the value for.
     * @param {Schema} value - The value to be stored.
     * @returns {Promise<void>} A promise that resolves when the value is set.
     * @abstract
     */
    protected abstract _set(key: string, value: Schema): Promise<void>

    /**
     * Removes the value associated with the specified key from the storage.
     *
     * Subclasses must implement this method to define how the value is removed.
     *
     * @param {string} key - The key to remove the value for.
     * @returns {Promise<void>} A promise that resolves when the value is removed.
     * @abstract
     */
    protected abstract _remove(key: string): Promise<void>

    /**
     * Clears all values from the storage.
     *
     * Subclasses must implement this method to define how the storage is cleared.
     *
     * @returns {Promise<void>} A promise that resolves when the storage is cleared.
     * @abstract
     */
    protected abstract _reset(): Promise<void>

    /**
     * Saves the current state of the storage.
     *
     * Subclasses must implement this method to define how the state is saved.
     *
     * @returns {Promise<void>} A promise that resolves when the state is saved.
     * @abstract
     */
    protected abstract _save(): Promise<void>
}
