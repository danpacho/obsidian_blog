import { describe, expect, it } from 'vitest'
import { ParamAnalyzer } from './param.analyzer'

describe('ParamAnalyzer – default "[ ]" delimiters', () => {
    describe('isSingleDynamicParam', () => {
        it('returns true for single dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.isSingleDynamicParam('[param]')).toBe(true)
        })

        it('returns false for non-dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.isSingleDynamicParam('param')).toBe(false)
        })
    })

    describe('isMultipleDynamicParam', () => {
        it('returns true for spread dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.isMultipleDynamicParam('[...params]')).toBe(true)
        })

        it('returns false for non-dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.isMultipleDynamicParam('params')).toBe(false)
        })
    })

    describe('analyzeSingleParam (default tags)', () => {
        it('handles single dynamic', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.analyzeSingleParam('[param]')).toEqual({
                isDynamicParam: true,
                isMultiple: false,
                paramName: 'param',
            })
        })

        it('handles spread dynamic', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.analyzeSingleParam('[...params]')).toEqual({
                isDynamicParam: true,
                isMultiple: true,
                paramName: 'params',
            })
        })

        it('handles static divider', () => {
            const analyzer = new ParamAnalyzer()
            expect(analyzer.analyzeSingleParam('param')).toEqual({
                dividerName: 'param',
                isDynamicParam: false,
                isMultiple: false,
            })
        })
    })

    describe('analyzeParam – mixed example', () => {
        it('handles [category]/<not-dynamic]/[...post]', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[category]/<not-dynamic]/[...post]'
            expect(analyzer.analyzeParam(paramString)).toEqual({
                dynamicParams: ['category', 'post'],
                result: [
                    {
                        isDynamicParam: true,
                        isMultiple: false,
                        paramName: 'category',
                    },
                    {
                        isDynamicParam: false,
                        isMultiple: false,
                        dividerName: '<not-dynamic]',
                    },
                    {
                        isDynamicParam: true,
                        isMultiple: true,
                        paramName: 'post',
                    },
                ],
            })
        })
    })
})

describe('ParamAnalyzer – custom delimiters', () => {
    const analyzer = new ParamAnalyzer({ openTag: '{', closeTag: '}' })

    it('detects dynamic params with { }', () => {
        expect(analyzer.isSingleDynamicParam('{id}')).toBe(true)
        expect(analyzer.isMultipleDynamicParam('{...slug}')).toBe(true)
    })

    it('analyses single + spread with { }', () => {
        expect(analyzer.analyzeSingleParam('{id}')).toEqual({
            isDynamicParam: true,
            isMultiple: false,
            paramName: 'id',
        })
        expect(analyzer.analyzeSingleParam('{...slug}')).toEqual({
            isDynamicParam: true,
            isMultiple: true,
            paramName: 'slug',
        })
    })

    it('analyses multi-segment path with { }', () => {
        const res = analyzer.analyzeParam('{lang}/{cat}/{...rest}')
        expect(res).toEqual({
            dynamicParams: ['lang', 'cat', 'rest'],
            result: [
                { isDynamicParam: true, isMultiple: false, paramName: 'lang' },
                { isDynamicParam: true, isMultiple: false, paramName: 'cat' },
                { isDynamicParam: true, isMultiple: true, paramName: 'rest' },
            ],
        })
    })
})

describe('ParamAnalyzer – constructor validation', () => {
    it('throws if tag chars are longer than one', () => {
        expect(
            () => new ParamAnalyzer({ openTag: '[[', closeTag: ']]' })
        ).toThrow(TypeError)
    })

    it('throws if openTag === closeTag', () => {
        expect(
            () => new ParamAnalyzer({ openTag: '!', closeTag: '!' })
        ).toThrow(TypeError)
    })

    it('throws on invalid filesystem characters', () => {
        expect(
            () => new ParamAnalyzer({ openTag: '*', closeTag: ']' })
        ).toThrow(TypeError)
    })
})

describe('ParamAnalyzer – structural validation', () => {
    it('throws if spread param is not last segment', () => {
        const analyzer = new ParamAnalyzer()
        expect(() => analyzer.analyzeParam('[...slug]/static')).toThrow(
            TypeError
        )
    })
})

describe('ParamAnalyzer – legacy paramShape override', () => {
    const parenShape = {
        single: /\(.*?\)/,
        multiple: /\(\.\.\..*?\)/,
    }
    const extractor = {
        single: (s: string) => s.replace(/\(|\)/g, ''),
        multiple: (s: string) => s.replace(/\(|\)|\.\.\./g, ''),
    }

    const analyzer = new ParamAnalyzer({
        openTag: '{', // should be ignored because custom regex wins
        closeTag: '}',
        paramShape: parenShape,
        paramExtractor: extractor,
    })

    it('respects custom regex for (param) style', () => {
        expect(analyzer.isSingleDynamicParam('(uid)')).toBe(true)
        expect(analyzer.isMultipleDynamicParam('(...rest)')).toBe(true)

        expect(analyzer.analyzeSingleParam('(uid)')).toEqual({
            isDynamicParam: true,
            isMultiple: false,
            paramName: 'uid',
        })
    })
})
