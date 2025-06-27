// tests/logger.test.ts
import stripAnsi from 'strip-ansi'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Logger } from '.' // adjust path if needed

import type { LogOption, LoggerConstructor } from '.'

/* -------------------------------------------------------------------------- */
/*  helpers                                                                    */
/* -------------------------------------------------------------------------- */
function makeLogger(opts: Partial<LoggerConstructor> = {}) {
    return new Logger({ name: 'TestLogger', ...opts })
}

/** Capture *all* text sent to a console method for the duration of a test. */
function withConsoleSpy<M extends keyof Console>(method: M) {
    const calls: string[] = []
    //@ts-ignore
    const spy = vi.spyOn(console, method).mockImplementation(function (
        this: unknown,
        ...args: unknown[]
    ) {
        calls.push(stripAnsi(args.join(' ')))
        return undefined
    })
    return {
        last: () => calls.at(-1) ?? '',
        restore: () => spy.mockRestore(),
    }
}

/* -------------------------------------------------------------------------- */
/*  basic log()                                                               */
/* -------------------------------------------------------------------------- */
describe('Logger – basic log()', () => {
    it('prints a simple string with default formatting', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger().log('hello')
        expect(last()).toMatch(/› hello$/)
        restore()
    })

    it('adds name when prefix:"full"', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger().log('world', { prefix: 'full' })
        expect(last()).toMatch(/TestLogger: world$/)
        restore()
    })

    it('omits prefix arrow with prefix:"none"', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger().log('plain', { prefix: 'none' })
        expect(last()).toBe('plain')
        restore()
    })

    it('accepts arbitrary objects and formats them', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger().log({ a: 1, b: [1, 2] } as const)
        expect(last()).toContain('{ a: 1, b: [ 1, 2 ] }')
        restore()
    })
})

/* -------------------------------------------------------------------------- */
/*  date prefix                                                               */
/* -------------------------------------------------------------------------- */
describe('Logger – date prefix', () => {
    const fakeISO = '2025-05-08T00:00:00.000Z'

    beforeEach(() => vi.setSystemTime(new Date(fakeISO)))
    afterEach(() => vi.useRealTimers())

    it('prepends ISO date when useDate=true', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger({ useDate: true }).log('dated')
        expect(last()).toMatch(new RegExp(`^${fakeISO}`))
        restore()
    })
})

/* -------------------------------------------------------------------------- */
/*  level helpers                                                             */
/* -------------------------------------------------------------------------- */
describe('Logger – level helpers', () => {
    type Level = 'info' | 'warn' | 'error' | 'success'
    const cases: Record<Level, { consoleMethod: keyof Console; tag: RegExp }> =
        {
            info: { consoleMethod: 'info', tag: / INFO / },
            warn: { consoleMethod: 'warn', tag: / WARN / },
            error: { consoleMethod: 'error', tag: / ERROR / },
            success: { consoleMethod: 'log', tag: / SUCCESS / },
        }

    for (const lvl of Object.keys(cases) as Level[]) {
        it(`${lvl}() prints with coloured tag`, () => {
            const { consoleMethod, tag } = cases[lvl]
            const { last, restore } = withConsoleSpy(consoleMethod)
            ;(makeLogger() as any)[lvl]('message')
            expect(last()).toMatch(tag)
            expect(last()).toMatch(/TestLogger/)
            restore()
        })
    }
})

/* -------------------------------------------------------------------------- */
/*  structural helpers                                                        */
/* -------------------------------------------------------------------------- */
describe('Logger – structural helpers', () => {
    it('tab() prepends configured whitespace', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger({ tabSize: 2 }).tab('indented')
        expect(last()).toBe('  indented')
        restore()
    })

    it('box() outputs a boxed message', () => {
        const { last, restore } = withConsoleSpy('log')
        makeLogger().box('boxed!')
        const lines = last().split('\n')
        expect(lines[0]).toMatch(/┌/) // top border
        expect(last()).toContain('boxed!')
        restore()
    })
})

/* -------------------------------------------------------------------------- */
/*  trailing-option parsing                                                   */
/* -------------------------------------------------------------------------- */
describe('Logger – trailing LogOption detection', () => {
    it('parses LogOption even with multiple data args', () => {
        const { last, restore } = withConsoleSpy('log')
        const opt: LogOption = { prefix: 'none', depth: 2 }
        makeLogger().log('one', 'two', opt)
        expect(last()).toBe('one two')
        restore()
    })
})
