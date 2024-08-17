import { statSync } from 'node:fs'
import { stat } from 'node:fs/promises'

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
}
