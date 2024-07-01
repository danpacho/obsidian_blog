import boxen, { Options } from 'boxen'
import c from 'chalk'

interface LoggerOptions {
    name: string
    spaceSize?: number
    tabSize?: number
    useDate?: boolean
}
interface LogOption {
    enter?: boolean
    depth?: number
    prefix?: boolean
}

/* eslint-disable no-console */
export class Logger {
    public constructor(options: LoggerOptions | undefined = undefined) {
        if (options) {
            const { spaceSize, tabSize, name } = options
            this._tabSize = tabSize ?? 4
            this._spaceSize = spaceSize ?? 1
            this.name = name
            this._useDate = options.useDate ?? false
        }
    }
    private name: string = 'Logger'
    private _useDate: boolean = false
    private _tabSize: number = 4
    private _spaceSize: number = 1
    private join(...stringVector: string[]): string {
        return stringVector.join(this.spaceStr)
    }
    private $c: typeof c = c
    public get c(): typeof c {
        return this.$c
    }
    private $log(messages: string[], enter: boolean = false) {
        console.log(
            enter ? this.enter(this.join(...messages)) : this.join(...messages)
        )
    }

    public log(
        message: string,
        options: LogOption = {
            enter: false,
            depth: 0,
            prefix: true,
        }
    ) {
        const { enter, depth } = options
        const depthStr =
            depth && depth > 0 ? `${this.tabStr.repeat(depth)}` : ''
        const messageWithPrefix = `${this.name}: ${message}`
        const logMessage = options.prefix
            ? [depthStr, this.c.gray('›'), messageWithPrefix]
            : [message]
        this.$log(logMessage, enter)
    }
    public updateName(name: string) {
        this.name = name
    }
    public box(message: string, options?: Options & LogOption) {
        this.log(boxen(message, options), options)
    }
    public info(message: string) {
        console.info(
            this.join(
                this.c.bgBlueBright.bold.black(` INFO `),
                this.c.blue(this.name),
                message
            )
        )
    }
    public warn(message: string) {
        console.warn(
            this.join(
                this.c.bgYellow.bold.black(` WARN `),
                this.c.yellow(this.name),
                message
            )
        )
    }
    public error(message: string) {
        console.error(
            this.join(
                this.c.bgRed.bold.black(` ERROR `),
                this.c.red(this.name),
                message
            )
        )
    }
    public success(message: string) {
        console.log(
            this.join(
                this.c.bgGreen.bold.black(` SUCCESS `),
                this.c.green(this.name),
                message
            )
        )
    }
    public tab(message?: string) {
        this.$log([this.tabStr, message ?? ''])
    }
    public enter(message: string) {
        return `${message}\n`
    }
    public get tabStr(): string {
        return ' '.repeat(this._tabSize)
    }
    public get spaceStr(): string {
        return ' '.repeat(this._spaceSize)
    }
}
