import { createReadStream, statSync } from 'node:fs'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { glob, globSync } from 'glob'

import type { PromiseCallbacks, Promisify, Stateful } from '../promisify'
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
            const fileStat = await stat(filePath)

            if (!fileStat.isFile()) {
                const error = new Error(`Path is not a file: ${filePath}`)
                handler?.onError?.(error)
                return { success: false, error }
            }

            if (fileStat.size === 0) {
                handler?.onSuccess?.(new Uint8Array())
                return { success: true, data: new Uint8Array() }
            }

            const buffer = await readFile(filePath)
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
            const fileStat = await stat(filePath)

            if (!fileStat.isFile()) {
                const error = new Error(`Path is not a file: ${filePath}`)
                handler?.onError?.(error)
                return { success: false, error }
            }

            if (fileStat.size === 0) {
                handler?.onSuccess?.('')
                return { success: true, data: '' }
            }

            const rawStr = await readFile(filePath, { encoding: 'utf-8' })
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
        const result = await this.readFile(filePath)
        if (!result.success) {
            if (result.error instanceof Error) handler?.onError?.(result.error)
            return result
        }

        try {
            const data = JSON.parse(result.data) as T
            if (handler?.validator && !handler.validator(data)) {
                const validationError = new Error(
                    `Invalid JSON structure at ${filePath}`
                )
                handler?.onError?.(validationError)
                return { success: false, error: validationError }
            }

            handler?.onSuccess?.(data)
            return { success: true, data }
        } catch (e) {
            const parseError = new SyntaxError(
                `Failed to parse JSON file at ${filePath}: ${(e as Error).message}`
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
        return createReadStream(filePath, options)
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
            const fileStat = await stat(filePath)
            if (!fileStat.isFile()) {
                throw new Error(`Path is not a file: ${filePath}`)
            }

            const readableStream = this.createReadableStream(
                options
                    ? {
                          filePath,
                          options,
                      }
                    : {
                          filePath,
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
            const fileStat = await stat(directoryPath)
            if (!fileStat.isDirectory()) {
                const error = new Error(
                    `Path is not a directory: ${directoryPath}`
                )
                handler?.onError?.(error)
                return { success: false, error }
            }

            const finalOptions = {
                ...readdirOptions,
                encoding: 'utf-8',
                withFileTypes: true,
            } as const

            const dirDirent = await readdir(directoryPath, finalOptions)

            const directoryNodeList: DirectoryNode[] = dirDirent.map(
                (dirent) => ({
                    name: dirent.name,
                    // Using the original `directoryPath` is slightly more robust than `dirent.path`
                    // as it doesn't depend on a newer Node.js version.
                    path: path.join(directoryPath, dirent.name),
                    isDir: dirent.isDirectory(),
                    extension: dirent.isFile()
                        ? FileReader.getExtension(dirent.name)
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
            await access(path)
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
        const { size } = await stat(path)
        return size
    }

    /**
     * Get the file extension from a file path string.
     * @param filePath The file path to extract the extension from.
     */
    public static getExtension(filePath: string): string | undefined {
        // No longer resolves the path against the CWD.
        return path.extname(filePath).slice(1) || undefined
    }

    /**
     * Get the file name with extension from a file path string.
     * @param filePath The file path to extract the file name from.
     */
    public static getFileNameWithExtension(filePath: string): string {
        // No longer resolves the path against the CWD.
        return path.basename(filePath)
    }

    /**
     * Get the file name without extension from a file path string.
     * @param filePath The file path to extract the file name from.
     */
    public static getFileName(filePath: string): string {
        // No longer resolves the path against the CWD.
        const fileNameWithExtension =
            FileReader.getFileNameWithExtension(filePath)
        return path.basename(
            fileNameWithExtension,
            path.extname(fileNameWithExtension)
        )
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

    // Other  methods remain the same but are now more reliable due to the above fixes.
    public static POSIX_SEP = '/' as const

    public static toPosix(pathname: string): string {
        return pathname.split(path.sep).join(FileReader.POSIX_SEP)
    }

    /**
     * Convert a file path to an **absolute** POSIX path.
     * @param pathname The file path to convert to POSIX absolute path.
     */
    public static toPosixAbs(pathname: string): string {
        return path.resolve(FileReader.toPosix(pathname))
    }

    /**
     * Get the relative POSIX path from one path to another.
     * @param from The starting path.
     * @param to The target path.
     * @returns The relative POSIX path.
     */
    public static getRelativePosixPath(from: string, to: string): string {
        return path.relative(
            FileReader.toPosixAbs(from),
            FileReader.toPosixAbs(to)
        )
    }

    /**
     * Remove the file extension from a file path.
     * @param filePath The file path to remove the extension from.
     */
    public static removeExtension(filePath: string): string {
        const extension = path.extname(filePath) // ".md"
        if (!extension) return filePath // No extension, return original path
        return filePath.slice(0, -extension.length) // Remove the extension
    }

    /**
     * Split a file path into its individual parts.
     * @param filePath The file path to split into parts.
     * @returns An array of path parts.
     */
    public static splitToPathParts(filePath: string): Array<string> {
        const pathPartsPOSIX = FileReader.removeExtension(
            FileReader.toPosix(filePath)
        )
        return pathPartsPOSIX.split(FileReader.POSIX_SEP)
    }
}

/**
 * A utility class for finding file paths.
 */
export class FilePathFinder {
    constructor() {}
    /**
     * Finds files matching a name and optional extension.
     * @param fileName The name of the file to find (without extension).
     * @param extension The file extension.
     * @param ignore A list of glob patterns to ignore.
     * @returns A promise that resolves to a list of matching directory nodes.
     */
    public async findFile(
        fileName: string,
        extension?: string,
        ignore?: string[]
    ): Promisify<DirectoryNode[]> {
        try {
            // First, attempt to stat the path directly.
            const fileStat = await stat(fileName).catch(() => null)
            if (fileStat) {
                return {
                    success: true,
                    data: [
                        {
                            name: FileReader.getFileNameWithExtension(fileName),
                            path: fileName,
                            isDir: fileStat.isDirectory(),
                            extension: fileStat.isFile()
                                ? FileReader.getExtension(fileName)
                                : undefined,
                        },
                    ],
                }
            }

            // If stat fails, perform a glob search.
            const pattern = extension
                ? `**/${fileName}.${extension}`
                : `**/${fileName}`
            const matches = await glob(pattern, {
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'out/**',
                    'build/**',
                    'coverage/**',
                    ...(ignore ?? []),
                ],
                withFileTypes: true,
            })

            const pathList: DirectoryNode[] = matches.map((t) => ({
                name: t.name,
                path: path.join(t.path, t.name),
                isDir: t.isDirectory(),
                // Uses the robust getExtension method.
                extension: t.isFile()
                    ? FileReader.getExtension(t.name)
                    : undefined,
            }))

            return { success: true, data: pathList }
        } catch (e) {
            return { success: false, error: e }
        }
    }

    /**
     * Synchronously finds files matching a name and optional extension.
     * @param fileName The name of the file to find (without extension).
     * @param extension The file extension.
     * @param ignore A list of glob patterns to ignore.
     * @returns A result object containing a list of matching directory nodes.
     */
    public findFileSync(
        fileName: string,
        extension?: string,
        ignore?: string[]
    ): Stateful<DirectoryNode[]> {
        try {
            // First, attempt to stat the path directly.
            const fileStat = statSync(fileName, { throwIfNoEntry: false })
            if (fileStat) {
                return {
                    success: true,
                    data: [
                        {
                            name: FileReader.getFileNameWithExtension(fileName),
                            path: fileName,
                            isDir: fileStat.isDirectory(),
                            extension: fileStat.isFile()
                                ? FileReader.getExtension(fileName)
                                : undefined,
                        },
                    ],
                }
            }

            // If stat fails, perform a glob search.
            const pattern = extension
                ? `**/${fileName}.${extension}`
                : `**/${fileName}`
            const matches = globSync(pattern, {
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'out/**',
                    'build/**',
                    'coverage/**',
                    ...(ignore ?? []),
                ],
                withFileTypes: true,
            })

            const pathList: DirectoryNode[] = matches.map((t) => ({
                name: t.name,
                path: path.join(t.path, t.name),
                isDir: t.isDirectory(),
                // Uses the robust getExtension method.
                extension: t.isFile()
                    ? FileReader.getExtension(t.name)
                    : undefined,
            }))

            return { success: true, data: pathList }
        } catch (e) {
            return { success: false, error: e }
        }
    }
}
