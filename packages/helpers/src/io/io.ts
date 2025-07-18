import { rename } from 'node:fs/promises'

import { FilePathFinder } from './file_path_finder'
import { FileReader } from './file_reader'
import { FileWriter } from './file_writer'
import { PathResolver } from './path_resolver'

import type { ReadStreamOptions } from './file_reader'
import type { WriteStreamOption } from './file_writer'
import type { PromiseCallbacks, Promisify } from '../promisify'

/**
 * Orchestrating file system I/O operations.
 */
/**
 * @class IO
 * @description Provides a high-level abstraction for common file system input/output operations.
 * It encapsulates file reading, writing, and path finding functionalities.
 * All methods are asynchronous and return a `Promisify` object, which is a standardized
 * result object indicating success or failure.
 */
export class IO {
    /**
     * @param pathResolver Path resolver for normalizing and resolving paths.
     * @param writer File writer for writing and deleting files.
     * @param reader File reader for reading files and directories.
     * @param finder File path finder for locating files in the file system.
     */
    public constructor(
        public readonly pathResolver: PathResolver = new PathResolver(),
        public readonly writer: FileWriter = new FileWriter(pathResolver),
        public readonly reader: FileReader = new FileReader(pathResolver),
        public readonly finder: FilePathFinder = new FilePathFinder(
            pathResolver
        )
    ) {}

    /**
     * Copies a file from a source path to a destination path.
     * This method is overloaded to handle binary ('media') and text content,
     * returning the appropriate data type.
     * @param {object} options - The copy options.
     * @param {string} options.from - The source file path.
     * @param {string} options.to - The destination file path.
     * @param {'media'} [options.type] - Specifies the content type as binary.
     * @param {PromiseCallbacks<Uint8Array, Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<Uint8Array>} A promise that resolves with the result of the operation, containing the file content as a Uint8Array on success.
     */
    public async cpFile(
        { from, to, type }: { from: string; to: string; type?: 'media' },
        handler?: PromiseCallbacks<Uint8Array, Error>
    ): Promisify<Uint8Array>
    /**
     * Copies a file from a source path to a destination path.
     * This method is overloaded to handle binary ('media') and text content,
     * returning the appropriate data type.
     * @param {object} options - The copy options.
     * @param {string} options.from - The source file path.
     * @param {string} options.to - The destination file path.
     * @param {'text'} [options.type] - Specifies the content type as text.
     * @param {PromiseCallbacks<string, Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<string>} A promise that resolves with the result of the operation, containing the file content as a string on success.
     */
    public async cpFile(
        { from, to, type }: { from: string; to: string; type?: 'text' },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string>
    public async cpFile(
        {
            from,
            to,
            type = 'text',
        }: { from: string; to: string; type?: 'media' | 'text' },
        handler?: PromiseCallbacks<Uint8Array | string, Error>
    ): Promisify<Uint8Array | string> {
        const normalizedFrom = this.pathResolver.normalize(from)
        const normalizedTo = this.pathResolver.normalize(to)
        try {
            const readResult =
                type === 'text'
                    ? await this.reader.readFile(normalizedFrom)
                    : await this.reader.readMedia(normalizedFrom)

            if (!readResult.success) {
                throw readResult.error
            }

            const writeResult = await this.writer.write({
                filePath: normalizedTo,
                data: readResult.data,
            })

            if (!writeResult.success) {
                throw writeResult.error
            }

            handler?.onSuccess?.(readResult.data)
            return { success: true, data: readResult.data }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Copies a file from a source to a destination using readable and writable streams.
     * This is more memory-efficient for large files than `cpFile`.
     * @param {object} options - The stream copy options.
     * @param {string} options.from - The source file path.
     * @param {string} options.to - The destination file path.
     * @param {ReadStreamOptions} [options.readOptions] - Optional configuration for the read stream.
     * @param {WriteStreamOption} [options.writeOptions] - Optional configuration for the write stream.
     * @param {PromiseCallbacks<void, Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<void>} A promise that resolves with the result of the operation.
     */
    public async cpFileStream(
        {
            from,
            to,
            readOptions,
            writeOptions,
        }: {
            from: string
            to: string
            readOptions?: ReadStreamOptions
            writeOptions?: WriteStreamOption
        },
        handler?: PromiseCallbacks<void, Error>
    ): Promisify<void> {
        // Normalize paths before using them.
        const normalizedFrom = this.pathResolver.normalize(from)
        const normalizedTo = this.pathResolver.normalize(to)
        try {
            const readStream = this.reader.createReadableStream(
                readOptions
                    ? {
                          filePath: normalizedFrom,
                          options: readOptions,
                      }
                    : {
                          filePath: normalizedFrom,
                      }
            )

            const writeResult = await this.writer.writeStream(
                writeOptions
                    ? {
                          filePath: normalizedTo,
                          stream: readStream,
                          options: writeOptions,
                      }
                    : {
                          filePath: normalizedTo,
                          stream: readStream,
                      }
            )

            if (!writeResult.success) {
                throw writeResult.error
            }

            handler?.onSuccess?.()
            return { success: true, data: undefined }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Recursively copies a directory
     * It prevents copying a directory into itself.
     * @param {object} options - The directory copy options.
     * @param {string} options.from - The source directory path.
     * @param {string} options.to - The destination directory path.
     * @param {PromiseCallbacks<string[], Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<string[]>} A promise that resolves with the result, containing an array of the copied destination paths on success.
     */
    public async cpDirectory(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<string[], Error>
    ): Promisify<string[]> {
        // Normalize paths before using them.
        const normalizedFrom = this.pathResolver.normalize(from)
        const normalizedTo = this.pathResolver.normalize(to)
        // Store the paths of copied files for the result.
        const copiedPaths: string[] = []
        try {
            const fromAbs = this.pathResolver.resolve(normalizedFrom)
            const toAbs = this.pathResolver.resolve(normalizedTo)

            if (toAbs.startsWith(fromAbs + this.pathResolver.sep)) {
                throw new Error('Cannot copy a directory into itself.')
            }

            const entries = await this.reader.readDirectory(normalizedFrom)
            if (!entries.success) throw entries.error

            await this.writer.createDirectory(normalizedTo)

            const copyPromises = entries.data.map((node) => {
                const fromPath = this.pathResolver.join(
                    normalizedFrom,
                    node.name
                )
                const toPath = this.pathResolver.join(normalizedTo, node.name)
                copiedPaths.push(toPath)

                if (node.isDir) {
                    return this.cpDirectory({
                        from: fromPath,
                        to: toPath,
                    })
                }
                return this.cpFileStream({
                    from: fromPath,
                    to: toPath,
                })
            })

            const results = await Promise.allSettled(copyPromises)

            const errors = results
                .map((result) => {
                    if (result.status === 'rejected') {
                        return result.reason instanceof Error
                            ? result.reason
                            : new Error(String(result.reason))
                    }
                    if (
                        result.status === 'fulfilled' &&
                        !result.value.success
                    ) {
                        return result.value.error instanceof Error
                            ? result.value.error
                            : new Error(String(result.value.error))
                    }
                    return null
                })
                .filter((error): error is Error => error !== null)

            if (errors.length > 0) {
                throw new Error(
                    `Failed to copy some items: ${errors.length} errors found.`,
                    { cause: errors.map((e) => e.message) }
                )
            }

            handler?.onSuccess?.(copiedPaths)
            return { success: true, data: copiedPaths }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Moves a file from a source to a destination.
     * It first attempts an atomic rename operation. If that fails (e.g., moving across different file systems),
     * it falls back to a copy-and-delete operation.
     * @param {object} options - The move options.
     * @param {string} options.from - The source file path.
     * @param {string} options.to - The destination file path.
     * @param {PromiseCallbacks<string, Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<string>} A promise that resolves with the result, containing the destination path on success.
     */
    public async moveFile(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        // Normalize paths before using them.
        const normalizedFrom = this.pathResolver.normalize(from)
        const normalizedTo = this.pathResolver.normalize(to)
        try {
            await rename(normalizedFrom, normalizedTo)
            handler?.onSuccess?.(normalizedTo)
            return { success: true, data: normalizedTo }
        } catch {
            try {
                const copyResult = await this.cpFileStream({
                    from: normalizedFrom,
                    to: normalizedTo,
                })
                if (!copyResult.success) throw copyResult.error

                await this.writer.deleteFile(normalizedFrom)

                handler?.onSuccess?.(normalizedTo)
                return { success: true, data: normalizedTo }
            } catch (fallbackError) {
                if (fallbackError instanceof Error)
                    handler?.onError?.(fallbackError)
                return { success: false, error: fallbackError }
            }
        }
    }

    /**
     * Moves a directory from a source to a destination. It intelligently handles different scenarios:
     * 1. Tries a fast atomic rename.
     * 2. If the destination exists and is not empty (`ENOTEMPTY` or `EEXIST` error), it merges the source directory's contents into the destination.
     * 3. If the move is across different devices (`EXDEV` error), it falls back to a copy-then-delete operation.
     * @param {object} options - The move options.
     * @param {string} options.from - The source directory path.
     * @param {string} options.to - The destination directory path.
     * @param {PromiseCallbacks<string, Error>} [handler] - Optional callbacks for success or error.
     * @returns {Promisify<string>} A promise that resolves with the result, containing the destination path on success.
     */
    public async moveDirectory(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        // Normalize paths before using them.
        const normalizedFrom = this.pathResolver.normalize(from)
        const normalizedTo = this.pathResolver.normalize(to)
        try {
            await rename(normalizedFrom, normalizedTo)
            handler?.onSuccess?.(normalizedTo)
            return { success: true, data: normalizedTo }
        } catch (error: any) {
            if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
                try {
                    const entries =
                        await this.reader.readDirectory(normalizedFrom)
                    if (!entries.success) throw entries.error // Propagate read error

                    for (const node of entries.data) {
                        const fromPath = this.pathResolver.join(
                            normalizedFrom,
                            node.name
                        )
                        const toPath = this.pathResolver.join(
                            normalizedTo,
                            node.name
                        )

                        // Recursively move each item from the source into the destination folder
                        const moveResult = node.isDir
                            ? await this.moveDirectory({
                                  from: fromPath,
                                  to: toPath,
                              })
                            : await this.moveFile({
                                  from: fromPath,
                                  to: toPath,
                              })

                        // If any sub-move fails, we must stop and report the failure.
                        if (!moveResult.success) {
                            throw new Error(
                                `Failed to move sub-item ${node.name}`,
                                { cause: moveResult.error }
                            )
                        }
                    }

                    // After successfully moving all contents, delete the now-empty source folder.
                    await this.writer.deleteDirectory(normalizedFrom)

                    handler?.onSuccess?.(normalizedTo)
                    return { success: true, data: normalizedTo }
                } catch (mergeError) {
                    if (mergeError instanceof Error)
                        handler?.onError?.(mergeError)
                    return { success: false, error: mergeError }
                }
            }

            if (error.code === 'EXDEV') {
                try {
                    const copyResult = await this.cpDirectory({
                        from: normalizedFrom,
                        to: normalizedTo,
                    })
                    if (!copyResult.success) throw copyResult.error

                    await this.writer.deleteDirectory(normalizedFrom)

                    handler?.onSuccess?.(normalizedTo)
                    return { success: true, data: normalizedTo }
                } catch (fallbackError) {
                    if (fallbackError instanceof Error)
                        handler?.onError?.(fallbackError)
                    return { success: false, error: fallbackError }
                }
            }

            // --- For all other errors, report failure ---
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }
}
