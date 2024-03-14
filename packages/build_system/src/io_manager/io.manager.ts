import { PromiseCallbacks, Promisify } from '../utils/promisify'
import { FilePathFinder, FileReader } from './file.reader'
import { FileWriter } from './file.writer'

export class IOManager {
    constructor(
        public readonly writer: FileWriter = new FileWriter(),
        public readonly reader: FileReader = new FileReader(),
        public readonly finder: FilePathFinder = new FilePathFinder()
    ) {}

    public async cpFile(
        { from, to, type }: { from: string; to: string; type?: 'media' },
        handler?: PromiseCallbacks<Uint8Array, Error>
    ): Promisify<Uint8Array>
    public async cpFile(
        { from, to, type }: { from: string; to: string; type?: 'text' },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string>
    public async cpFile(
        {
            from,
            to,
            type = 'text',
        }: { from: string; to: string; type?: 'media' | 'text' },
        handler?: PromiseCallbacks<Uint8Array | string, Error>
    ): Promisify<Uint8Array | string> {
        const copyTarget =
            type === 'text'
                ? await this.reader.readFile(from)
                : await this.reader.readMedia(from)
        if (!copyTarget.success) {
            if (copyTarget.error instanceof Error)
                handler?.onError?.(copyTarget.error)

            return {
                success: false,
                error: copyTarget.error,
            }
        }

        const { data } = copyTarget

        const writeTarget = await this.writer.write({
            filePath: to,
            data: data,
        })

        if (!writeTarget.success) {
            if (writeTarget.error instanceof Error)
                handler?.onError?.(writeTarget.error)

            return {
                success: false,
                error: writeTarget.error,
            }
        }

        handler?.onSuccess?.(data)
        return {
            success: true,
            data,
        }
    }

    public async cpFolder(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<Array<string>, Error>
    ): Promisify<Array<string>> {
        const copyTarget = await this.reader.readDir(from)
        if (!copyTarget.success) {
            if (copyTarget.error instanceof Error)
                handler?.onError?.(copyTarget.error)

            return {
                success: false,
                error: copyTarget.error,
            }
        }

        const cpResult = await Promise.allSettled(
            copyTarget.data.map(async (file) => {
                const fromPath = `${from}/${file.name}`
                const toPath = `${to}/${file.name}`
                if (file.isDir) {
                    await this.cpFolder({
                        from: fromPath,
                        to: toPath,
                    })
                }
                return this.cpFile({
                    from: fromPath,
                    to: toPath,
                })
            })
        )

        const errorMap = cpResult.reduce<Array<Error>>((errorMap, curr) => {
            if (curr.status === 'rejected') {
                const errorMap = curr.reason
                errorMap.push(errorMap)
            }
            return errorMap
        }, [])

        if (errorMap.length > 0) {
            const writeError = new Error('Error while copying files', {
                cause: errorMap,
            })
            handler?.onError?.(writeError)
            return {
                success: false,
                error: writeError,
            }
        }

        const writtenFiles = copyTarget.data.map((file) => `${to}/${file.name}`)
        handler?.onSuccess?.(writtenFiles)

        return {
            success: true,
            data: writtenFiles,
        }
    }

    public async moveFile(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const fileCp = await this.cpFile({ from, to })

        if (!fileCp.success) {
            if (fileCp.error instanceof Error) handler?.onError?.(fileCp.error)

            return {
                success: false,
                error: fileCp.error,
            }
        }

        const deleteTarget = await this.writer.deleteFile(from)

        if (!deleteTarget.success) {
            if (deleteTarget.error instanceof Error)
                handler?.onError?.(deleteTarget.error)

            return {
                success: false,
                error: deleteTarget.error,
            }
        }

        handler?.onSuccess?.(to)
        return {
            success: true,
            data: to,
        }
    }

    public async moveFolder(
        { from, to }: { from: string; to: string },
        handler?: PromiseCallbacks<string, Error>
    ): Promisify<string> {
        const folderCp = await this.cpFolder({ from, to })

        if (!folderCp.success) {
            if (folderCp.error instanceof Error)
                handler?.onError?.(folderCp.error)

            return {
                success: false,
                error: folderCp.error,
            }
        }

        const deleteTarget = await this.writer.deleteFolder__FORCE(from)

        if (!deleteTarget.success) {
            if (deleteTarget.error instanceof Error)
                handler?.onError?.(deleteTarget.error)

            return {
                success: false,
                error: deleteTarget.error,
            }
        }

        handler?.onSuccess?.(to)
        return {
            success: true,
            data: to,
        }
    }
}
