import { mkdir, rm, rmdir, unlink, writeFile } from 'node:fs/promises'
import { PromiseCallbacks, Promisify } from '../utils/promisify'

export class FileWriter {
    public constructor() {}

    /**
     * Writes data to a file.
     * @param filePath The path to the file.
     * @param file The text to write to the file.
     */
    public async write({
        filePath,
        data,
        handler,
    }: {
        filePath: string
        data: Parameters<typeof writeFile>[1]
        handler?: PromiseCallbacks<AbortController, Error>
    }): Promisify<AbortController> {
        const controller = new AbortController()
        const { signal } = controller

        const targetFolder = filePath.split('/').slice(0, -1).join('/')
        try {
            await this.createFolder(targetFolder)

            await writeFile(filePath, data, {
                encoding: 'utf-8',
                signal,
            })
            handler?.onSuccess?.(controller)

            return {
                success: true,
                data: controller,
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
     * Creates a new folder.
     * @param folderPath The path to the folder.
     */
    public async createFolder(
        folderPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        try {
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
