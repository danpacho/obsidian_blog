import path from 'node:path'
import { ReadStream, createReadStream, statSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { glob, globSync } from 'glob'

import type { PromiseCallbacks, Promisify, Stateful } from '../promisify'

export interface DirectoryNode {
    name: string
    path: string
    isDir: boolean
    extension: string | undefined
}

export type RawFile = string

export type ReadStreamOption =
    | Exclude<
          Parameters<typeof createReadStream>[1],
          undefined | BufferEncoding
      >
    | undefined

export class FileReader {
    public constructor() {}

    public async fileSize(path: string): Promise<number> {
        const { size } = await stat(path)
        return size
    }

    public async fileExists(path: string): Promise<boolean> {
        try {
            await stat(path)
            return true
        } catch {
            return false
        }
    }

    public async readMedia(
        path: string,
        handler?: PromiseCallbacks<Uint8Array, Error>
    ): Promisify<Uint8Array> {
        if (!(await this.fileExists(path))) {
            const error = new Error(`File not found: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
        // If file is folder, return empty string
        const fileStat = await stat(path)
        if (fileStat.isDirectory()) {
            const error = new Error(`Path is a directory: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
        // If file is not a media file, return empty string
        if (!fileStat.isFile()) {
            const error = new Error(`Path is not a file: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
        // If file is empty, return empty string
        if (fileStat.size === 0) {
            handler?.onSuccess?.(new Uint8Array())
            return {
                success: true,
                data: new Uint8Array(),
            }
        }
        // Read file as binary
        try {
            const buffer = new Uint8Array(await readFile(path))
            handler?.onSuccess?.(buffer)
            return {
                success: true,
                data: buffer,
            }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)
            return {
                success: false,
                error: e,
            }
        }
    }

    public readMediaStreamPure({
        filePath,
        options,
    }: {
        filePath: string
        options?: ReadStreamOption
    }): ReadStream {
        const abortController = new AbortController()
        // const size = (await stat(filePath)).size

        const readableStream: ReadStream = createReadStream(filePath, {
            signal: abortController.signal,
            encoding: 'binary',
            // start: 0,
            // end: size,
            ...options,
        })

        return readableStream
    }

    public async readMediaStream({
        filePath,
        handler,
        options,
    }: {
        filePath: string
        handler?: PromiseCallbacks<Uint8Array, Error>
        options?: ReadStreamOption
    }): Promisify<{ data: Uint8Array; stream: ReadStream }> {
        if (!(await this.fileExists(filePath))) {
            const error = new Error(`File not found: ${filePath}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }

        const readableStream = this.readMediaStreamPure({
            filePath,
            options,
        })

        try {
            const dataChunks: Uint8Array[] = []
            let totalLength = 0

            readableStream.on('data', (chunk: string | Buffer) => {
                if (typeof chunk === 'string') {
                    return
                }
                dataChunks.push(chunk)
                totalLength += chunk.length
            })

            const chunk = await new Promise<Uint8Array>((resolve, reject) => {
                readableStream.on('end', () => {
                    const data = new Uint8Array(totalLength)
                    let offset = 0
                    for (const chunk of dataChunks) {
                        data.set(chunk, offset)
                        offset += chunk.length
                    }
                    resolve(data)
                })
                readableStream.on('error', reject)
            })

            handler?.onSuccess?.(chunk)

            return {
                success: true,
                data: {
                    data: chunk,
                    stream: readableStream,
                },
            }
        } catch (e) {
            if (e instanceof Error) {
                handler?.onError?.(e)
                readableStream.destroy(e)
            }
            return {
                success: false,
                error: e,
            }
        }
    }

    public async readFile(
        path: string,
        handler?: PromiseCallbacks<RawFile, Error>
    ): Promisify<RawFile> {
        if (!(await this.fileExists(path))) {
            const error = new Error(`File not found: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }

        // If file is folder, return empty string
        const fileStat = await stat(path)
        if (fileStat.isDirectory()) {
            const error = new Error(`Path is a directory: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
        // If file is not a text file, return empty string
        if (!fileStat.isFile()) {
            const error = new Error(`Path is not a file: ${path}`)
            handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
        // If file is empty, return empty string
        if (fileStat.size === 0) {
            handler?.onSuccess?.('')
            return {
                success: true,
                data: '',
            }
        }
        try {
            const rawStr: string = await readFile(path, {
                encoding: 'utf-8',
            })
            handler?.onSuccess?.(rawStr)
            return {
                success: true,
                data: rawStr,
            }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)
            return {
                success: false,
                error: e,
            }
        }
    }

    /**
     * Get the file extension from a file path.
     * @param filePath The file path to extract the extension from.
     */
    public static getExtension(filePath: string): string | undefined {
        const fileNameWithExtension =
            FileReader.getFileNameWithExtension(filePath) // "baz.md"
        return path.extname(fileNameWithExtension).slice(1) || undefined
    }

    /**
     * Get the file name with extension from a file path.
     * @param filePath The file path to extract the file name with extension from.
     */
    public static getFileNameWithExtension(filePath: string): string {
        const base = path.basename(path.resolve(path.normalize(filePath))) // "baz.md"
        return base
    }

    /**
     * POSIX file separator.
     * @default '/'
     */
    public static POSIX_SEP = '/' as const

    /**
     * Convert a file path to a POSIX path.
     * @param pathname The file path to convert to POSIX format.
     */
    public static toPosix(pathname: string): string {
        return path
            .normalize(pathname)
            .split(path.sep)
            .join(FileReader.POSIX_SEP)
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

    /**
     * Get the file name without extension from a file path.
     * @param filePath The file path to extract the file name from.
     */
    public static getFileName(filePath: string): string {
        const fileNameWithExtension =
            FileReader.getFileNameWithExtension(filePath) // "baz.md"
        return path.basename(
            fileNameWithExtension,
            path.extname(fileNameWithExtension)
        ) // "baz" | "README"
    }

    public async readDir(
        path: string,
        handler?: PromiseCallbacks<Array<DirectoryNode>, Error>,
        readdirOptions?: Partial<Parameters<typeof readdir>[1]>
    ): Promisify<Array<DirectoryNode>> {
        try {
            const pathExists = await this.fileExists(path)
            if (!pathExists) {
                const error = new Error(`Directory not found: ${path}`)
                handler?.onError?.(error)
                return {
                    success: false,
                    error,
                }
            }
            // If path is not a directory, return empty array
            const fileStat = await stat(path)
            if (!fileStat.isDirectory()) {
                const error = new Error(`Path is not a directory: ${path}`)
                handler?.onError?.(error)
                return {
                    success: false,
                    error,
                }
            }

            // Read directory
            const dirDirent = await readdir(path, {
                encoding: 'utf-8',
                recursive: false,
                withFileTypes: true,
                ...readdirOptions,
            })

            const directoryNodeList: Array<DirectoryNode> = dirDirent.map(
                (dirent) => ({
                    name: dirent.name,
                    path: `${dirent.path}/${dirent.name}`,
                    isDir: dirent.isDirectory(),
                    extension: FileReader.getExtension(dirent.name),
                })
            )
            handler?.onSuccess?.(directoryNodeList)

            return {
                success: true,
                data: directoryNodeList,
            }
        } catch (e) {
            if (e instanceof Error) handler?.onError?.(e)

            return {
                success: false,
                error: e,
            }
        }
    }
}

export class FilePathFinder {
    public constructor() {}

    public async findFile(
        fileName: string,
        extension?: string,
        ignore?: Array<string>
    ): Promisify<DirectoryNode[]> {
        try {
            const isFileAlreadyExist = await stat(fileName)
            const isDir = isFileAlreadyExist.isDirectory()
            if (isFileAlreadyExist.isFile() || isDir) {
                return {
                    success: true,
                    data: [
                        {
                            extension: FileReader.getExtension(fileName),
                            name: fileName,
                            isDir,
                            path: fileName,
                        },
                    ],
                }
            }
        } catch {
            // DO NOTHING
        }

        const requestPathPattern = extension
            ? `**/${fileName}.${extension}`
            : `**/${fileName}`
        try {
            const matchedRawPathList = await glob(requestPathPattern, {
                ignore: [
                    // filter out start with .
                    '.*',
                    'node_modules/**',
                    'dist/**',
                    'out/**',
                    'build/**',
                    'build/**',
                    'coverage/**',
                    ...(ignore ?? []),
                ],
                withFileTypes: true,
            })
            const pathList: Array<DirectoryNode> = matchedRawPathList.map(
                (t) => ({
                    name: t.name,
                    path: `${t.path}/${t.name}`,
                    isDir: t.isDirectory(),
                    extension: t.name.split('.')[1],
                })
            )

            return {
                success: true,
                data: pathList,
            }
        } catch (e) {
            return {
                success: false,
                error: e,
            }
        }
    }

    public findFileSync(
        fileName: string,
        extension?: string,
        ignore?: Array<string>
    ): Stateful<Array<DirectoryNode>> {
        try {
            const isFileAlreadyExist = statSync(fileName)
            const isDir = isFileAlreadyExist.isDirectory()
            if (isFileAlreadyExist.isFile() || isDir) {
                return {
                    success: true,
                    data: [
                        {
                            extension: FileReader.getExtension(fileName),
                            name: fileName,
                            isDir,
                            path: fileName,
                        },
                    ],
                }
            }
        } catch {
            // DO NOTHING
        }

        const requestPathPattern = extension
            ? `**/${fileName}.${extension}`
            : `**/${fileName}`
        try {
            const matchedRawPathList = globSync(requestPathPattern, {
                ignore: [
                    'node_modules/**',
                    'dist/**',
                    'build/**',
                    'coverage/**',
                    ...(ignore ?? []),
                ],
                withFileTypes: true,
            })
            const pathList: Array<DirectoryNode> = matchedRawPathList.map(
                (t) => ({
                    name: t.name,
                    path: `${t.path}/${t.name}`,
                    isDir: t.isDirectory(),
                    extension: t.name.split('.')[1],
                })
            )

            return {
                success: true,
                data: pathList,
            }
        } catch (e) {
            return {
                success: false,
                error: e,
            }
        }
    }
}
