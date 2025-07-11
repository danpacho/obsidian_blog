import { statSync } from 'fs'
import { stat } from 'fs/promises'

import { glob, globSync } from 'glob'

import type { Promisify, Stateful } from '../promisify'
import type { DirectoryNode } from './file_reader'
import type { PathResolver } from './path_resolver'

/**
 * A utility class for finding file paths.
 */
export class FilePathFinder {
    constructor(private readonly pathResolver: PathResolver) {}
    /**
     * Finds files matching a name and optional extension.
     * @param fileName The name of the file to find (without extension) or a direct path.
     * @param extension The file extension (used for glob search).
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
            if (fileStat !== undefined && fileStat !== null) {
                return {
                    success: true,
                    data: [
                        {
                            name: this.pathResolver.getFileNameWithExtension(
                                fileName
                            ),
                            path: this.pathResolver.normalize(fileName),
                            isDir: fileStat.isDirectory(),
                            extension: fileStat.isFile()
                                ? this.pathResolver.getExtension(fileName)
                                : undefined,
                        },
                    ],
                }
            }

            // If stat fails for a simple name, perform a glob search.
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

            if (matches.length === 0) {
                return {
                    success: false,
                    error: new Error(
                        `No files found matching pattern: ${pattern}`
                    ),
                }
            }

            const pathList: DirectoryNode[] = matches.map((t) => ({
                name: t.name,
                path: this.pathResolver.normalize(t.fullpath()),
                isDir: t.isDirectory(),
                extension: t.isFile()
                    ? this.pathResolver.getExtension(t.name)
                    : undefined,
            }))

            return { success: true, data: pathList }
        } catch (e) {
            return { success: false, error: e }
        }
    }

    /**
     * Synchronously finds files matching a name and optional extension.
     * @param fileName The name of the file to find (without extension) or a direct path.
     * @param extension The file extension (used for glob search).
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

            if (fileStat !== undefined && fileStat !== null) {
                return {
                    success: true,
                    data: [
                        {
                            name: this.pathResolver.getFileNameWithExtension(
                                fileName
                            ),
                            path: this.pathResolver.normalize(fileName),
                            isDir: fileStat.isDirectory(),
                            extension: fileStat.isFile()
                                ? this.pathResolver.getExtension(fileName)
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

            if (matches.length === 0) {
                return {
                    success: false,
                    error: new Error(
                        `No files found matching pattern: ${pattern}`
                    ),
                }
            }

            const pathList: DirectoryNode[] = matches.map((t) => ({
                name: t.name,
                path: this.pathResolver.normalize(t.fullpath()),
                isDir: t.isDirectory(),
                extension: t.isFile()
                    ? this.pathResolver.getExtension(t.name)
                    : undefined,
            }))

            return { success: true, data: pathList }
        } catch (e) {
            return { success: false, error: e }
        }
    }
}
