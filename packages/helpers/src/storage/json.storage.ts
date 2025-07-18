import { StorageError } from './error'
import { json } from './json'
import { StorageInterface } from './storage.interface'

import type { StorageConstructor } from './storage.interface'

export interface JsonStorageConstructor extends StorageConstructor {
    serializer?: (data: any) => string
    deserializer?: (json: string) => any
}

/**
 * Represents a JSON storage implementation that extends a base storage interface.
 * @template Schema - The type of the data schema.
 */
export class JsonStorage<Schema = any> extends StorageInterface<Schema> {
    /**
     * Constructs a new instance of the JsonStorage class.
     * @param options - The options for the JSON storage.
     */
    public constructor(
        public override readonly options: JsonStorageConstructor
    ) {
        const extension = options.root.split('.').pop()
        if (extension !== 'json') {
            throw new StorageError(
                'Invalid storage options provided.',
                'The storage root extension must be "json".',
                'The storage root should be a valid JSON file name.'
            )
        }
        super(options)
    }

    public updateSerializer(
        serializer: (data: Record<string, Schema>) => string
    ) {
        this.options.serializer = serializer
    }

    public updateDeserializer(
        deserializer: (json: string) => Record<string, Schema>
    ) {
        this.options.deserializer = deserializer
    }

    public get serializer(): (data: Record<string, Schema>) => string {
        return this.options.serializer ?? json.serialize
    }

    public get deserializer(): (json: string) => Record<string, Schema> {
        return this.options.deserializer ?? json.deserialize
    }

    /**
     * Gets the underlying storage `json`
     */
    public get storageJson(): string {
        return this.serializer(this.storageRecord)
    }

    public async load(): Promise<void> {
        try {
            const fileExists = await this.$io.reader.checkExists(
                this.options.root
            )
            if (!fileExists) {
                await this.init()
                return
            }

            const loaded = await this.$io.reader.readFile(this.options.root)

            if (!loaded.success) {
                throw new StorageError(
                    'load',
                    'Failed to read storage file',
                    'Storage file should be readable',
                    JSON.stringify(loaded.error, null, 2)
                )
            }

            const isEmpty = loaded.data.trim() === ''
            if (isEmpty) {
                // If file is empty, initialize with an empty map
                this._storage = new Map<string, Schema>()
                return
            }

            try {
                const parsedLoadedData = this.deserializer(loaded.data)
                this._storage = new Map(Object.entries(parsedLoadedData))
            } catch (parseError) {
                throw new StorageError(
                    'load',
                    'Failed to parse storage file',
                    'Storage file should contain valid JSON',
                    parseError instanceof Error ? parseError.message : undefined
                )
            }
        } catch (error) {
            throw new StorageError(
                'load',
                'Failed to load storage file',
                'Storage file should be loaded successfully',
                error instanceof Error ? error.message : undefined
            )
        }
    }

    /**
     * Retrieves the value associated with the specified key from the storage.
     * @param key - The key to retrieve the value for.
     * @returns The value associated with the key, or undefined if the key does not exist.
     * @throws {StorageError} If there is an error retrieving the value.
     */
    protected _get(key: string): Schema | undefined {
        try {
            const founded = this.storage.get(key)
            return founded
        } catch (error) {
            throw new StorageError(
                'get',
                `Failed to get value for key: ${key}`,
                'Key should return associated value or undefined',
                error instanceof Error ? error.message : undefined
            )
        }
    }

    /**
     * Sets the value associated with the specified key in the storage.
     * @param key - The key to set the value for.
     * @param value - The value to set.
     * @throws {StorageError} If there is an error setting the value.
     */
    protected async _set(key: string, value: Schema): Promise<void> {
        try {
            this.storage.set(key, value)
            await this.save()
        } catch (error) {
            throw new StorageError(
                'set',
                `Failed to set value for key: ${key}`,
                'Value should be set and persisted successfully',
                error instanceof Error ? error.message : undefined
            )
        }
    }

    /**
     * Removes the value associated with the specified key from the storage.
     * @param key - The key to remove the value for.
     * @throws {StorageError} If there is an error removing the value.
     */
    protected async _remove(key: string): Promise<void> {
        try {
            this.storage.delete(key)
            await this.save()
        } catch (error) {
            throw new StorageError(
                'remove',
                `Failed to remove value for key: ${key}`,
                'Key should be removed and changes should be persisted',
                error instanceof Error ? error.message : undefined
            )
        }
    }

    /**
     * Clears the storage by removing all keys and values.
     * @throws {StorageError} If there is an error clearing the storage.
     */
    protected async _reset(): Promise<void> {
        try {
            this.storage.clear()
            await this.save()
        } catch (error) {
            throw new StorageError(
                'clear',
                'Failed to clear storage',
                'All keys should be removed and changes should be persisted',
                error instanceof Error ? error.message : undefined
            )
        }
    }

    /**
     * Saves the data to the storage file.
     * @throws {StorageError} If there is an error saving the storage file.
     */
    protected async _save(): Promise<void> {
        try {
            const result = await this.$io.writer.write({
                filePath: this.options.root,
                data: this.storageJson,
            })
            if (!result.success) {
                throw new StorageError(
                    'save',
                    'Failed to save storage file',
                    'Storage data should be saved successfully',
                    JSON.stringify(result.error, null, 2)
                )
            }
        } catch (error) {
            throw new StorageError(
                'save',
                'Failed to save storage file',
                'Storage data should be saved successfully',
                error instanceof Error ? error.message : undefined
            )
        }
    }
}
