// src/logger/index.ts
import util from 'node:util'

import boxen from 'boxen'
import chalk from 'chalk'

import { Stack } from '../stack'

import type { Options as BoxenOptions } from 'boxen'

export interface LoggerConstructor {
    name: string
    spaceSize?: number
    tabSize?: number
    useDate?: boolean
}
export interface LogOption {
    enter?: boolean
    depth?: number
    prefix?: 'base' | 'full' | 'none'
}

type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogHistory {
    /**
     * Log depth
     */
    level: LogLevel
    /**
     * Log messages
     */
    message: string | Array<string>
}

/* eslint-disable no-console */
export class Logger {
    private name = 'Logger'
    private useDate = false
    private tabSize = 4
    private spaceSize = 1

    public constructor(opts?: LoggerConstructor) {
        if (!opts) return
        this.name = opts.name
        this.spaceSize = opts.spaceSize ?? this.spaceSize
        this.tabSize = opts.tabSize ?? this.tabSize
        this.useDate = opts.useDate ?? this.useDate
    }

    private messageStack: Stack<LogHistory> = new Stack()

    /**
     * @returns logging history
     */
    public getHistory(): Array<LogHistory> {
        return this.messageStack.stack
    }

    /* ------------------------------------------------------------------ */
    /*  helpers                                                           */
    /* ------------------------------------------------------------------ */
    private get tabStr() {
        return ' '.repeat(this.tabSize)
    }
    private get spaceStr() {
        return ' '.repeat(this.spaceSize)
    }

    private isLogOption = (v: unknown): v is LogOption =>
        !!v &&
        typeof v === 'object' &&
        ['enter', 'depth', 'prefix'].some((k) => k in (v as LogOption))

    /** Deterministic object formatting (no ANSI, controllable depth). */
    private fmt = (arg: unknown, depth?: number) =>
        typeof arg === 'string'
            ? arg
            : util.inspect(arg, { depth, colors: false })

    private join = (...parts: string[]) => parts.join(this.spaceStr)

    private withDate = (txt: string) =>
        this.useDate ? `${new Date().toISOString()}${this.spaceStr}${txt}` : txt

    private write = (level: LogLevel, txt: string, enter = false) =>
        (console[level] as (msg: string) => void)(enter ? `${txt}\n` : txt)

    /* ------------------------------------------------------------------ */
    /*  public API                                                        */
    /* ------------------------------------------------------------------ */
    public log(...params: Array<unknown | LogOption>): void {
        let opts: LogOption | undefined
        if (this.isLogOption(params.at(-1))) opts = params.pop() as LogOption

        const { enter = false, depth, prefix = 'base' } = opts ?? {}
        const rendered = params
            .map((p) => this.fmt(p, depth))
            .join(this.spaceStr)
        const depthStr = depth && depth > 0 ? this.tabStr.repeat(depth) : ''

        const msg =
            prefix === 'none'
                ? rendered
                : this.join(
                      depthStr,
                      chalk.gray('›'),
                      prefix === 'full' ? `${this.name}: ${rendered}` : rendered
                  )

        this.messageStack.push({
            level: 'log',
            message: rendered,
        })
        this.write('log', this.withDate(msg), enter)
    }

    public updateName(name: string) {
        // clear message stack when logger changed.
        this.messageStack.clear()
        this.name = name
    }

    public box(msg: string, opts?: BoxenOptions) {
        this.write('log', boxen(msg, opts))
    }

    /**
     * Get `chalk` instance
     */
    public get c() {
        return chalk
    }

    /* ---- tagged helpers --------------------------------------------- */
    private tagged(
        label: string,
        labelStyler: (s: string) => string,
        msgStyler: (s: string) => string,
        level: LogLevel,
        parts: unknown[]
    ) {
        const rendered = parts.map((p) => this.fmt(p))
        const txt = this.join(
            labelStyler(` ${label} `),
            msgStyler(this.name),
            ...rendered
        )
        this.messageStack.push({ level: level, message: rendered })
        this.write(level, this.withDate(txt))
    }

    public info(...m: unknown[]) {
        this.tagged(
            'INFO',
            chalk.bgBlueBright.bold.black,
            chalk.blue,
            'info',
            m
        )
    }
    public warn(...m: unknown[]) {
        this.tagged('WARN', chalk.bgYellow.bold.black, chalk.yellow, 'warn', m)
    }
    public error(...m: unknown[]) {
        this.tagged('ERROR', chalk.bgRed.bold.black, chalk.red, 'error', m)
    }
    public success(...m: unknown[]) {
        this.tagged('SUCCESS', chalk.bgGreen.bold.black, chalk.green, 'log', m)
    }

    /* ---- structural helpers ----------------------------------------- */
    public tab(...msgs: unknown[]) {
        const txt = `${this.tabStr}${msgs.map((m) => this.fmt(m)).join(this.spaceStr)}`
        this.write('log', this.withDate(txt))
    }
}
