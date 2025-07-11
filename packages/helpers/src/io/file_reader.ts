import { createReadStream } from 'node:fs'
import { access, readFile, readdir, stat } from 'node:fs/promises'

import type { PathResolver } from './path_resolver'
import type { PromiseCallbacks, Promisify } from '../promisify'
import type { ReadStream } from 'node:fs'

export interface DirectoryNode {
    name: string
    path: string
    isDir: boolean
    extension: string | undefined
}

export type RawFile = string

export type ReadStreamOptions = Exclude<
    Parameters<typeof createReadStream>[1],
    undefined | BufferEncoding
>

/**
 * A utility class for reading files and directories from the filesystem.
 */
export class FileReader {
    constructor(private readonly pathResolver: PathResolver) {}
    /**
     * Reads a file and returns its content as a Uint8Array (binary buffer).
     * This method is suitable for reading binary files like images or audio.
     * @param filePath The path to the file.
     * @param handler Optional callbacks for success or error.
     * @returns A promise that resolves to a result object containing the file content.
     */
    public async readMedia(
        filePath: string,
        handler?: PromiseCallbacks<Uint8Array, Error>
    ): Promisify<Uint8Array> {
        try {
            const osPath = this.pathResolver.normalize(filePath)
            const fileStat = await stat(osPath)

            if (!fileStat.isFile()) {
                const error = new Error(`Path is not a file: ${osPath}`)
                handler?.onError?.(error)
                return { success: false, error }
            }

            if (fileStat.size === 0) {
                handler?.onSuccess?.(new Uint8Array())
                return { success: true, data: new Uint8Array() }
            }

            const buffer = await readFile(osPath)
            const data = new Uint8Array(buffer)
            handler?.onSuccess?.(data)
            return { success: true, data }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)
            return { success: false, error: e }
        }
    }

    /**
     * Reads a text file and returns its content as a string.
     * @param filePath The path to the file.
     * @param handler Optional callbacks for success or error.
     * @returns A promise that resolves to a result object containing the file content.
     */
    public async readFile(
        filePath: string,
        handler?: PromiseCallbacks<RawFile, Error>
    ): Promisify<RawFile> {
        try {
            const osPath = this.pathResolver.normalize(filePath)
            const fileStat = await stat(osPath)

            if (!fileStat.isFile()) {
                const error = new Error(`Path is not a file: ${osPath}`)
                handler?.onError?.(error)
                return { success: false, error }
            }

            if (fileStat.size === 0) {
                handler?.onSuccess?.('')
                return { success: true, data: '' }
            }

            const rawStr = await readFile(osPath, { encoding: 'utf-8' })
            handler?.onSuccess?.(rawStr)
            return { success: true, data: rawStr }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)
            return { success: false, error: e }
        }
    }

    /**
     * Reads and parses a JSON file.
     * @param filePath The path to the JSON file.
     * @param handler Optional callbacks for success or error.
     * @returns A promise that resolves to a result object containing the parsed JSON data.
     */
    public async readJsonFile<T = unknown>(
        filePath: string,
        handler?: PromiseCallbacks<T, Error> & {
            validator?: (data: unknown) => data is T
        }
    ): Promisify<T> {
        const osPath = this.pathResolver.normalize(filePath)
        const result = await this.readFile(osPath)
        if (!result.success) {
            if (result.error instanceof Error) handler?.onError?.(result.error)
            return result
        }

        try {
            const data = JSON.parse(result.data) as T
            if (handler?.validator && !handler.validator(data)) {
                const validationError = new Error(
                    `Invalid JSON structure at ${osPath}`
                )
                handler?.onError?.(validationError)
                return { success: false, error: validationError }
            }

            handler?.onSuccess?.(data)
            return { success: true, data }
        } catch (e) {
            const parseError = new SyntaxError(
                `Failed to parse JSON file at ${osPath}: ${(e as Error).message}`
            )
            handler?.onError?.(parseError)
            return { success: false, error: parseError }
        }
    }

    /**
     * Creates and returns a readable stream for a file without any external controls.
     * @param filePath The path to the file.
     * @param options Options for creating the read stream.
     * @returns A `ReadStream` instance.
     */
    public createReadableStream({
        filePath,
        options,
    }: {
        filePath: string
        options?: ReadStreamOptions
    }): ReadStream {
        const osPath = this.pathResolver.normalize(filePath)
        return createReadStream(osPath, options)
    }

    /**
     * Consumes a file stream into a buffer.
     * Note: This method buffers the entire file in memory, similar to `readMedia`.
     * The original API is preserved for backward compatibility.
     * @param param0 The parameters for reading the media stream.
     * @returns A promise that resolves to the buffered data and the (ended) stream.
     */
    public async readMediaStream({
        filePath,
        handler,
        options,
    }: {
        filePath: string
        handler?: PromiseCallbacks<Uint8Array, Error>
        options?: ReadStreamOptions
    }): Promisify<{ data: Uint8Array; stream: ReadStream }> {
        try {
            const osPath = this.pathResolver.normalize(filePath)
            const fileStat = await stat(osPath)
            if (!fileStat.isFile()) {
                throw new Error(`Path is not a file: ${osPath}`)
            }

            const readableStream = this.createReadableStream(
                options
                    ? {
                          filePath: osPath,
                          options,
                      }
                    : {
                          filePath: osPath,
                      }
            )

            const chunk = await this.streamToBuffer(readableStream)

            handler?.onSuccess?.(chunk)

            return {
                success: true,
                // The stream is returned here already ended to maintain backward compatibility.
                data: { data: chunk, stream: readableStream },
            }
        } catch (e) {
            if (e instanceof Error) {
                handler?.onError?.(e)
            }
            return { success: false, error: e }
        }
    }

    /**
     * Reads the contents of a directory and returns a structured list of its entries.
     * @param directoryPath The path to the directory.
     * @param handler Optional callbacks for success or error.
     * @param readdirOptions Additional options for `fs.readdir`. Note: `withFileTypes` is always forced to `true` by this method.
     * @returns A promise that resolves to a list of directory nodes.
     */
    public async readDirectory(
        directoryPath: string,
        handler?: PromiseCallbacks<DirectoryNode[], Error>,
        readdirOptions?: Omit<Parameters<typeof readdir>[1], 'withFileTypes'>
    ): Promisify<DirectoryNode[]> {
        try {
            const osPath = this.pathResolver.normalize(directoryPath)
            const fileStat = await stat(osPath)
            if (!fileStat.isDirectory()) {
                const error = new Error(`Path is not a directory: ${osPath}`)
                handler?.onError?.(error)
                return { success: false, error }
            }

            const finalOptions = {
                ...readdirOptions,
                encoding: 'utf-8',
                withFileTypes: true,
            } as const

            const dirDirent = await readdir(osPath, finalOptions)

            const directoryNodeList: DirectoryNode[] = dirDirent.map(
                (dirent) => ({
                    name: dirent.name,
                    // Using the original `osPath` is slightly more robust than `dirent.path`
                    // as it doesn't depend on a newer Node.js version.
                    path: this.pathResolver.normalize(
                        this.pathResolver.join(osPath, dirent.name)
                    ),
                    isDir: dirent.isDirectory(),
                    extension: dirent.isFile()
                        ? this.pathResolver.getExtension(dirent.name)
                        : undefined,
                })
            )

            handler?.onSuccess?.(directoryNodeList)
            return { success: true, data: directoryNodeList }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)
            return { success: false, error: e }
        }
    }

    /**
     * Checks if a file or directory exists at the given path.
     * @param path The path to check.
     * @returns A promise that resolves to `true` if the path exists, `false` otherwise.
     */
    public async checkExists(path: string): Promise<boolean> {
        try {
            const osPath = this.pathResolver.normalize(path)
            await access(osPath)
            return true
        } catch {
            return false
        }
    }

    /**
     * Gets the size of a file in bytes.
     * @param path The path to the file.
     * @returns A promise that resolves to the file size.
     */
    public async getSize(path: string): Promise<number> {
        const osPath = this.pathResolver.normalize(path)
        const { size } = await stat(osPath)
        return size
    }

    /**
     * Convert a readable stream to a Buffer.
     * @param stream The readable stream to consume.
     * @returns A promise that resolves with the final Buffer.
     */
    public async streamToBuffer(stream: ReadStream): Promise<Uint8Array> {
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        return Buffer.concat(chunks)
    }
}
