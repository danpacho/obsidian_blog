type SingleParamAnalyzeResult =
    | {
          isDynamicParam: true
          isMultiple: boolean
          paramName: string
      }
    | {
          isDynamicParam: false
          isMultiple: false
          dividerName: string
      }

export interface ParamAnalyzerConstructor {
    paramShape?: {
        single: RegExp
        multiple: RegExp
    }
    paramExtractor?: {
        single?: (paramString: string) => string
        multiple?: (paramString: string) => string
    }
}
export class ParamAnalyzer {
    public constructor(public readonly options?: ParamAnalyzerConstructor) {}
    /**
     * @description dynamic param shape
     * @example
     * ```ts
     * // input param
     * const paramString = '[param]'
     * ParamAnalyzer.DynamicParamShape.single.test(paramString) // true
     * ```
     * @example
     * ```ts
     * // input param
     * const paramString = '[...params]'
     * ParamAnalyzer.DynamicParamShape.multiple.test(paramString) // true
     * ```
     */
    public static DefaultDynamicParamShape = {
        single: /(\[.*?\])/,
        multiple: /(\[\.\.\..*?\])/,
    }
    private get singleDynamicParamShape() {
        return (
            this.options?.paramShape?.single ||
            ParamAnalyzer.DefaultDynamicParamShape.single
        )
    }
    private get multipleDynamicParamShape() {
        return (
            this.options?.paramShape?.multiple ||
            ParamAnalyzer.DefaultDynamicParamShape.multiple
        )
    }
    private get singleParamExtractor() {
        return (
            this.options?.paramExtractor?.single ||
            ((paramString: string) => paramString.replace(/\[|\]/g, ''))
        )
    }
    private get multipleParamExtractor() {
        return (
            this.options?.paramExtractor?.multiple ||
            ((paramString: string) => paramString.replace(/\[|\]|\.\.\./g, ''))
        )
    }
    /**
     * @description check if the param is a single dynamic param
     * @example
     * ```ts
     * // input param
     * const paramString = '[param]'
     * ParamAnalyzer.isSingleDynamicParam(paramString) // true
     * ```
     * @param paramString param string
     */
    public isSingleDynamicParam(paramString: string): boolean {
        return this.singleDynamicParamShape.test(paramString)
    }

    /**
     * @description check if the param is a multiple dynamic param
     * @example
     * ```ts
     * // input param
     * const paramString = '[...params]'
     * ParamAnalyzer.isMultipleDynamicParam(paramString) // true
     * ```
     * @param paramString param string
     */
    public isMultipleDynamicParam(paramString: string): boolean {
        return this.multipleDynamicParamShape.test(paramString)
    }

    private isSingleParamString(paramString: string): boolean {
        const length = paramString.split('/').length
        return length === 1 || length === 0
    }

    /**
     * @description analyze param string
     * @example
     * ```ts
     * // Single dynamic param
     * const singleParamString = '[param]'
     * const res = ParamAnalyzer.AnalyzeParam(singleParamString)
     * const res = {
     *      isDynamicParam: true,
     *      isMultiple: false,
     *      paramName: 'param'
     * }
     * // Multiple dynamic param
     * const multipleParamString = '[...params]'
     * const res = ParamAnalyzer.AnalyzeParam(multipleParamString)
     * const res = {
     *      isDynamicParam: true,
     *      isMultiple: true,
     *      paramName: 'params'
     * }
     * ```
     * @param singleParamString param string
     */
    public analyzeSingleParam(
        singleParamString: string
    ): SingleParamAnalyzeResult {
        if (!this.isSingleParamString(singleParamString))
            throw new TypeError(
                `Invalid param string: not a single param string, ${singleParamString}`
            )

        if (
            this.isSingleDynamicParam(singleParamString) &&
            !this.isMultipleDynamicParam(singleParamString)
        ) {
            const paramName = this.singleParamExtractor(singleParamString)
            return {
                isDynamicParam: true,
                isMultiple: false,
                paramName,
            }
        }

        if (this.isMultipleDynamicParam(singleParamString)) {
            const paramName = this.multipleParamExtractor(singleParamString)
            return {
                isDynamicParam: true,
                isMultiple: true,
                paramName,
            }
        }

        return {
            isDynamicParam: false,
            isMultiple: false,
            dividerName: singleParamString,
        }
    }

    private getValidParamString(paramString: string): string {
        return paramString.split('/').filter(Boolean).join('/')
    }

    private isValidParamStructure(
        paramAnalyzedResult: Array<SingleParamAnalyzeResult>
    ): boolean {
        const dynamicMultipleParamIndex = paramAnalyzedResult.findIndex(
            (param) => param.isDynamicParam && param.isMultiple
        )
        if (dynamicMultipleParamIndex === -1) return true
        const length = paramAnalyzedResult.length

        const dynamicShouldBeLast = dynamicMultipleParamIndex === length - 1
        if (dynamicShouldBeLast) return true

        return false
    }

    public analyzeParam(paramString: string): {
        dynamicParams: Array<string>
        result: Array<SingleParamAnalyzeResult>
    } {
        const validParamString = this.getValidParamString(paramString)
        if (this.isSingleParamString(validParamString)) {
            const single = this.analyzeSingleParam(validParamString)
            return {
                result: [single],
                dynamicParams: single.isDynamicParam ? [single.paramName] : [],
            }
        }

        const multipleParamString = validParamString.split('/').filter(Boolean)
        const result = multipleParamString.map((param) =>
            this.analyzeSingleParam(param)
        )

        if (!this.isValidParamStructure(result)) {
            throw new TypeError(
                `Invalid param structure: ${validParamString}, multiple dynamic param should be the last param.`
            )
        }

        const dynamicParams = result
            .map((param) => {
                if (param.isDynamicParam) return param.paramName
                return null
            })
            .filter(Boolean) as Array<string>

        return {
            result,
            dynamicParams,
        }
    }
}
