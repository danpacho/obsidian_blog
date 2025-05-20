import { statSync } from 'node:fs'
import { rmdir, stat } from 'node:fs/promises'

export const Io = {
    fileExists: async (path: string): Promise<boolean> => {
        try {
            await stat(path)
            return true
        } catch {
            return false
        }
    },
    fileExistsSync: (path: string): boolean => {
        try {
            statSync(path)
            return true
        } catch {
            return false
        }
    },
    removeDir: async (dirPath: string): Promise<void> => {
        if (await Io.fileExists(dirPath)) {
            await rmdir(dirPath, { recursive: true })
        }
    },
}
