import { type ReadStream, type WriteStream, createWriteStream } from 'node:fs'
import {
    access,
    appendFile,
    constants,
    mkdir,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'

import type { PathResolver } from './path_resolver'
import type { PromiseCallbacks, Promisify } from '../promisify'

export type WriteStreamOption = Exclude<
    Parameters<typeof createWriteStream>[1],
    undefined | BufferEncoding
>

/**
 * A utility class for writing, modifying, and deleting files and directories.
 */
export class FileWriter {
    constructor(private readonly pathResolver: PathResolver) {}
    /**
     * Checks if a file or directory exists.
     */
    public async exists(target: string): Promise<boolean> {
        const normalizedPath = this.pathResolver.normalize(target)
        try {
            await access(normalizedPath, constants.F_OK)
            return true
        } catch {
            return false
        }
    }

    /**
     * Writes data to a file, creating parent directories if they don't exist.
     */
    public async write({
        filePath,
        data,
        handler,
    }: {
        filePath: string
        data: Uint8Array | string
        handler?: PromiseCallbacks<void, Error>
    }): Promisify<void> {
        const normalizedPath = this.pathResolver.normalize(filePath)
        const controller = new AbortController()
        try {
            const dir = dirname(normalizedPath)
            await mkdir(dir, { recursive: true })

            // Correctly handle options: only set encoding for strings.
            const options =
                typeof data === 'string'
                    ? { encoding: 'utf-8' as const, signal: controller.signal }
                    : { signal: controller.signal }

            await writeFile(normalizedPath, data, options)

            handler?.onSuccess?.()
            return { success: true, data: undefined }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                handler?.onError?.(error)
            }
            return { success: false, error }
        }
    }

    /**
     * Appends data to a file, creating the file and directories if they don't exist.
     */
    public async append({
        filePath,
        data,
        handler,
    }: {
        filePath: string
        data: Uint8Array | string
        handler?: PromiseCallbacks<void, Error>
    }): Promisify<void> {
        const normalizedPath = this.pathResolver.normalize(filePath)
        try {
            const dir = dirname(normalizedPath)
            await mkdir(dir, { recursive: true })

            const options =
                typeof data === 'string'
                    ? { encoding: 'utf-8' as const }
                    : undefined
            await appendFile(normalizedPath, data, options)

            handler?.onSuccess?.()
            return { success: true, data: undefined }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Writes a readable stream to a file.
     */
    public async writeStream({
        filePath,
        stream,
        handler,
        options,
    }: {
        filePath: string
        stream: ReadStream
        handler?: PromiseCallbacks<void, Error>
        options?: WriteStreamOption
    }): Promisify<void> {
        const normalizedPath = this.pathResolver.normalize(filePath)
        // Use a single controller for the entire pipeline.
        const controller = new AbortController()

        // Create the write stream lazily inside the try block.
        let writeStream: WriteStream

        try {
            // Ensure directory exists with one efficient call.
            const dir = dirname(normalizedPath)
            await mkdir(dir, { recursive: true })

            writeStream = createWriteStream(normalizedPath, {
                ...options,
                encoding: undefined,
            })

            // Await the promise-based pipeline. This fixes the race condition.
            await pipeline(stream, writeStream, { signal: controller.signal })

            handler?.onSuccess?.()
            return { success: true, data: undefined }
        } catch (error) {
            // Ensure the error is handled only once.
            if (error instanceof Error && error.name !== 'AbortError') {
                handler?.onError?.(error)
            }
            return { success: false, error }
        }
    }

    /**
     * Creates a directory, including any necessary parent directories.
     */
    public async createDirectory(
        directoryPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const normalizedPath = this.pathResolver.normalize(directoryPath)
        try {
            // Simplified: mkdir with recursive:true is idempotent and handles all cases.
            await mkdir(normalizedPath, { recursive: true })
            handler?.onSuccess?.(normalizedPath)
            return { success: true, data: normalizedPath }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Deletes a file.
     */
    public async deleteFile(
        filePath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const normalizedPath = this.pathResolver.normalize(filePath)
        try {
            // Use rm for consistency; it's the modern API for both files and dirs.
            await rm(normalizedPath, { force: true }) // force:true ignores "not found" errors.
            handler?.onSuccess?.(normalizedPath)
            return { success: true, data: normalizedPath }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Deletes a directory and all of its contents recursively.
     */
    public async deleteDirectory(
        directoryPath: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const normalizedPath = this.pathResolver.normalize(directoryPath)
        try {
            await rm(normalizedPath, { recursive: true, force: true })
            handler?.onSuccess?.(normalizedPath)
            return { success: true, data: normalizedPath }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }

    /**
     * Deletes a file or a folder (and its contents) at the given path.
     */
    public async delete(
        pathname: string,
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const normalizedPath = this.pathResolver.normalize(pathname)
        try {
            const stats = await stat(normalizedPath).catch(() => null)

            if (!stats) {
                // If the path doesn't exist, consider it a success (idempotent delete).
                handler?.onSuccess?.(normalizedPath)
                return { success: true, data: normalizedPath }
            }

            await rm(normalizedPath, {
                recursive: stats.isDirectory(),
                force: true,
            })

            handler?.onSuccess?.(normalizedPath)
            return { success: true, data: normalizedPath }
        } catch (error) {
            if (error instanceof Error) handler?.onError?.(error)
            return { success: false, error }
        }
    }
}
