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

        const readableStream: ReadStream = createReadStream(
            filePath,

            {
                signal: abortController.signal,
                encoding: 'binary',
                // start: 0,
                // end: size,
                ...options,
            }
        )

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
        const readableStream = this.readMediaStreamPure({
            filePath,
            options,
        })

        try {
            const dataChunks: Uint8Array[] = []
            let totalLength = 0

            readableStream.on('data', (chunk: Buffer) => {
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

    public static getExtension(path: string): string | undefined {
        const parts = path.split('.')
        return parts.length > 1 ? parts.pop() : undefined
    }

    public static getPureFileName(fileName: string): string {
        return fileName.replace(
            `.${String(FileReader.getExtension(fileName)) ?? ''}`,
            ''
        )
    }

    public async readDir(
        path: string,
        handler?: PromiseCallbacks<Array<DirectoryNode>, Error>,
        readdirOptions?: Partial<Parameters<typeof readdir>[1]>
    ): Promisify<Array<DirectoryNode>> {
        try {
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
