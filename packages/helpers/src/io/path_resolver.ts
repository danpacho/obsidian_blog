import os from 'os'
import path from 'path'
import { sep as PosixSep } from 'path/posix'
import { sep as Win32Sep } from 'path/win32'

export class PathResolver {
    /**
     * Normalizes an OS-dependent path string.
     * @param osDependentPath An unknown OS-dependent path string.
     */
    public normalize(osDependentPath: string): string {
        return path.normalize(osDependentPath)
    }

    /**
     * Resolves a sequence of paths or path segments into an absolute path.
     * @param osDependentPathList A sequence of paths to resolve.
     */
    public resolve(...osDependentPathList: Array<string>): string {
        // Normalizing inputs isn't strictly necessary as path.resolve does it,
        // but it doesn't hurt.
        return path.resolve(...osDependentPathList)
    }

    /**
     * Gets the file extension from a file path string (without the dot).
     * @param filePath The file path to extract the extension from.
     */
    public getExtension(filePath: string): string | undefined {
        // Refactored: Use path.parse for efficiency.
        const ext = path.parse(filePath).ext
        return ext ? ext.slice(1) : undefined
    }

    /**
     * Gets the file name with extension from a file path string.
     * @param filePath The file path to extract the file name from.
     */
    public getFileNameWithExtension(filePath: string): string {
        // Refactored: Use path.parse for efficiency.
        return path.parse(filePath).base
    }

    /**
     * Gets the file name without the extension from a file path string.
     * @param filePath The file path to extract the file name from.
     */
    public getFileName(filePath: string): string {
        // Refactored: The most direct and efficient way.
        return path.parse(filePath).name
    }

    /**
     * Gets the relative path from one path to another.
     * @param fromPath The starting path.
     * @param toPath The target path.
     * @returns The relative path.
     */
    public getRelativePath(fromPath: string, toPath: string): string {
        return path.relative(fromPath, toPath)
    }

    /**
     * Removes the file extension from a file path.
     * @param filePath The file path to remove the extension from.
     */
    public removeExtension(filePath: string): string {
        // Refactored: Robustly removes the extension using path.parse.
        // This fixes the previous bug that left a trailing dot.
        const parsed = path.parse(filePath)
        return path.join(parsed.dir, parsed.name)
    }

    /**
     * Converts path separators to match the current OS.
     * Note: `normalize` is usually what you want.
     * @param inputPath The path to convert.
     * @returns The path with OS-specific separators.
     */
    public resolveToOsPath(inputPath: string): string {
        const normalizedPath = this.normalize(inputPath)

        if (os.platform() === 'win32') {
            return normalizedPath.replaceAll(PosixSep, Win32Sep)
        } else {
            return normalizedPath.replaceAll(Win32Sep, PosixSep)
        }
    }

    /**
     * Splits a file path into its individual parts, excluding the extension.
     * @param filePath The file path to split into parts.
     * @returns An array of path parts.
     */
    public splitToPathSegments(filePath: string): string[] {
        // This method now correctly uses the refactored `removeExtension`.
        const pathWithoutExt = this.removeExtension(filePath)
        return pathWithoutExt.split(path.sep).filter(Boolean)
    }

    /**
     * Joins multiple paths into a single path.
     * @param paths The paths to join.
     * @returns The joined path.
     */
    public join(...paths: string[]): string {
        return path.join(...paths)
    }

    /**
     * Gets the path separator for the current operating system.
     * @returns The path separator ('/' for POSIX, '\' for Windows).
     */
    public get sep(): '\\' | '/' {
        return path.sep
    }
}
