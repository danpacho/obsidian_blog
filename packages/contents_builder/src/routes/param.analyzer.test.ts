import { describe, expect, it } from 'vitest'
import { ParamAnalyzer } from './param.analyzer'

describe('ParamAnalyzer', () => {
    describe('isSingleDynamicParam', () => {
        it('should return true for single dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[param]'
            const result = analyzer.isSingleDynamicParam(paramString)
            expect(result).toBe(true)
        })

        it('should return false for non-dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = 'param'
            const result = analyzer.isSingleDynamicParam(paramString)
            expect(result).toBe(false)
        })
    })

    describe('isMultipleDynamicParam', () => {
        it('should return true for multiple dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[...params]'
            const result = analyzer.isMultipleDynamicParam(paramString)
            expect(result).toBe(true)
        })

        it('should return false for non-dynamic param', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = 'params'
            const result = analyzer.isMultipleDynamicParam(paramString)
            expect(result).toBe(false)
        })
    })

    describe('analyzeParam', () => {
        it('should analyze single dynamic param correctly', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[param]'
            const result = analyzer.analyzeSingleParam(paramString)
            expect(result).toEqual({
                isDynamicParam: true,
                isMultiple: false,
                paramName: 'param',
            })
        })

        it('should analyze multiple dynamic param correctly', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[...params]'
            const result = analyzer.analyzeSingleParam(paramString)
            expect(result).toEqual({
                isDynamicParam: true,
                isMultiple: true,
                paramName: 'params',
            })
        })

        it('should analyze non-dynamic param correctly', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = 'param'
            const result = analyzer.analyzeSingleParam(paramString)
            expect(result).toEqual({
                dividerName: 'param',
                isDynamicParam: false,
                isMultiple: false,
            })
        })

        it('should analyze multiple dynamic combination params correctly', () => {
            const analyzer = new ParamAnalyzer()
            const paramString = '[category]/<not-dynamic]/[...post]'
            const result = analyzer.analyzeParam(paramString)
            expect(result).toEqual({
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
