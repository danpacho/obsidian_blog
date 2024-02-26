import c from 'chalk'
interface LoggerOptions {
    name: string
    spaceSize?: number
    tabSize?: number
}
/* eslint-disable no-console */
export class Logger {
    public constructor(options: LoggerOptions | undefined = undefined) {
        if (options) {
            const { spaceSize, tabSize, name } = options
            this._tabSize = tabSize ?? 4
            this._spaceSize = spaceSize ?? 1
            this.name = name
        }
        this.info(`Logger: ${this.name} initialized.`)
    }
    private name: string = 'Logger'
    private _tabSize: number = 4
    private _spaceSize: number = 1
    private join(...stringVector: string[]): string {
        return stringVector.join(this.spaceStr)
    }
    private $log(messages: string[], enter: boolean = false) {
        console.log(
            enter ? this.enter(this.join(...messages)) : this.join(...messages)
        )
    }

    public log(
        message: string,
        options: { enter?: boolean; depth?: number } = {
            enter: false,
            depth: 0,
        }
    ) {
        const { enter, depth } = options
        const depthStr =
            depth && depth > 0 ? `${this.tabStr.repeat(depth)}` : ''
        const messageWithPrefix = `${this.name}: ${message}`
        this.$log([depthStr, c.gray('›'), messageWithPrefix], enter)
    }
    public info(message: string) {
        console.info(
            this.join(c.bgBlueBright.bold(` INFO - ${this.name} `), message)
        )
    }
    public warn(message: string) {
        console.warn(
            this.join(c.bgYellow.bold(` WARN - ${this.name} `), message)
        )
    }
    public error(message: string) {
        console.error(
            this.join(c.bgRed.bold(` ERROR - ${this.name} `), message)
        )
    }
    public success(message: string) {
        console.log(
            this.join(c.bgGreen.bold(` SUCCESS - ${this.name} `), message)
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
