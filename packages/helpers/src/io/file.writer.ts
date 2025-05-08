import { type ReadStream, type WriteStream, createWriteStream } from 'node:fs'
import {
    access,
    constants,
    mkdir,
    rm,
    rmdir,
    unlink,
    writeFile,
} from 'node:fs/promises'
import { pipeline } from 'node:stream'
import { dirname } from 'node:path'
import type { PromiseCallbacks, Promisify } from '../promisify'

export type WriteStreamOption =
    | Exclude<
          Parameters<typeof createWriteStream>[1],
          undefined | BufferEncoding
      >
    | undefined

export class FileWriter {
    public constructor() {}

    /**
     * Check whether a file or directory exists.
     */
    public async exists(target: string): Promise<boolean> {
        try {
            await access(target, constants.F_OK)
            return true
        } catch {
            return false
        }
    }

    /**
     * Writes data to a file, creating any missing folders on the path.
     *
     * @param filePath - Full path (including filename) to write.
     * @param data     - Buffer|string data to write.
     * @param handler  - Optional success/error callbacks.
     */
    public async write({
        filePath,
        data,
        handler,
    }: {
        filePath: string
        data: Uint8Array | string
        handler?: PromiseCallbacks<AbortController, Error>
    }): Promise<Promisify<AbortController>> {
        const controller = new AbortController()
        const { signal } = controller

        // 1) Figure out the directory portion in a cross-platform way
        const dir = dirname(filePath)

        try {
            // 2) Ensure the directory exists (recursive=true is idempotent)
            await mkdir(dir, { recursive: true })

            // 3) Write the file
            await writeFile(filePath, data, {
                encoding: 'utf-8',
                signal,
            })

            handler?.onSuccess?.(controller)
            return { success: true, data: controller }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }
    /**
     * Writes a stream to a file and supports aborting the operation.
     * @param filePath The path to the file where the stream will be written.
     * @param stream The readable stream to write to the file.
     * @param handler Optional callbacks for success and error handling.
     */
    public writeStreamPure({
        filePath,
        options,
    }: {
        filePath: string
        options?: WriteStreamOption
    }): WriteStream {
        const writeStream: WriteStream = createWriteStream(filePath, {
            encoding: 'binary',
            start: 0,
            ...options,
        })

        return writeStream
    }

    /**
     * Writes a stream to a file and supports aborting the operation.
     * @param filePath The path to the file where the stream will be written.
     * @param stream The readable stream to write to the file.
     * @param handler Optional callbacks for success and error handling.
     */
    public async writeStream({
        filePath,
        stream,
        handler,
        options,
    }: {
        filePath: string
        stream: ReadStream
        handler?: PromiseCallbacks<AbortController, Error>
        options?: WriteStreamOption
    }): Promisify<AbortController> {
        const controller = new AbortController()
        const { signal } = controller

        const targetFolder = filePath.split('/').slice(0, -1).join('/')
        try {
            const targetFolderExists = await this.exists(targetFolder)
            if (!targetFolderExists) await this.createFolder(targetFolder)

            const writeStream: WriteStream = this.writeStreamPure({
                filePath,
                options,
            })

            // stream
            //     .on('error', (error) => {
            //         handler?.onError?.(error)
            //         writeStream.destroy()
            //         stream.destroy()
            //     })
            //     .on('data', (chunk) => {
            //         console.log('Writing chunk')
            //     })
            //     .on('drain', () => {
            //         console.log('Draining')
            //     })
            //     .on('end', () => {})

            signal.addEventListener('abort', () => {
                writeStream.destroy()
                stream.destroy()
            })

            pipeline(stream, writeStream, (error) => {
                if (error instanceof Error) handler?.onError?.(error)
            })

            await this.exists(filePath)

            handler?.onSuccess?.(controller)

            return {
                success: true,
                data: controller,
            }
        } catch (error) {
            if (error instanceof Error) {
                handler?.onError?.(error)
            }

            return {
                success: false,
                error,
            }
        }
    }

    /**
     * Creates a new folder.
     * @param folderPath The path to the folder.
     */
    public async createFolder(
        folderPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        try {
            const isFileAlreadyExist = await this.exists(folderPath)
            if (isFileAlreadyExist) {
                handler?.onSuccess?.(folderPath)
                return {
                    success: true,
                    data: folderPath,
                }
            }
            const createdFolder = await mkdir(folderPath, { recursive: true })
            if (!createdFolder) throw new Error('Folder not created')

            handler?.onSuccess?.(folderPath)
            return {
                success: true,
                data: folderPath,
            }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
    }

    /**
     * Deletes a file.
     * @param filePath The path to the file.
     */
    public async deleteFile(
        filePath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        try {
            await unlink(filePath)

            handler?.onSuccess?.(filePath)
            return {
                success: true,
                data: filePath,
            }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
    }

    /**
     * Deletes a folder.
     * @param folderPath The path to the folder.
     */
    public async deleteFolder(
        folderPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        try {
            await rmdir(folderPath)

            handler?.onSuccess?.(folderPath)
            return {
                success: true,
                data: folderPath,
            }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
    }

    public async deleteFolder__FORCE(
        folderPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        try {
            await rm(folderPath, { recursive: true, force: true })

            handler?.onSuccess?.(folderPath)
            return {
                success: true,
                data: folderPath,
            }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return {
                success: false,
                error,
            }
        }
    }
}
