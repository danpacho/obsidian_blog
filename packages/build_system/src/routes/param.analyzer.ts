/**
 * Represents the result of analyzing a single parameter in a route.
 */
type SingleParamAnalyzeResult =
    | {
          /**
           * Indicates whether the parameter is dynamic.
           */
          isDynamicParam: true
          /**
           * Indicates whether the parameter is multiple (`[...foo]`-style).
           */
          isMultiple: boolean
          /**
           * The name of the parameter (without the brackets / spread dots).
           */
          paramName: string
      }
    | {
          /**
           * Indicates whether the parameter is dynamic.
           */
          isDynamicParam: false
          /**
           * Indicates whether the parameter is multiple.
           */
          isMultiple: false
          /**
           * The literal divider name (static path segment).
           */
          dividerName: string
      }

/* ------------------------------------------------------------------ */
/* 🚀  Constructor options                                             */
/* ------------------------------------------------------------------ */

/**
 * Characters that cannot safely appear in a cross-platform file/folder name.
 * (Windows: < > : " / \ | ? *   •   POSIX: / and NUL)
 */
const INVALID_PATH_CHARS = '/\\?*:<>|"\u0000'.split('') as Array<string>

/**
 * Options accepted by {@link ParamAnalyzer}.
 *
 * – **openTag / closeTag** give a terse way to specify the dynamic-param
 *   delimiters (default `'['` + `']'`).
 * – The old `paramShape` / `paramExtractor` API is **still supported**
 *   and takes precedence when supplied, so existing code will continue
 *   to work unchanged.
 */
export interface ParamAnalyzerConstructor {
    /**
     * Opening delimiter for dynamic parameters (must be **one** character).
     * @default "["
     */
    openTag?: string
    /**
     * Closing delimiter for dynamic parameters (must be **one** character).
     * @default "]"
     */
    closeTag?: string
    /**
     * (Compatibility) Override the regular-expressions that recognise
     * single ( `[foo]` ) and multiple ( `[...bar]` ) dynamic parameters.
     */
    paramShape?: {
        single: RegExp
        multiple: RegExp
    }
    /**
     * (Compatibility) Override the functions that strip brackets / dots
     * from recognised parameter strings.
     */
    paramExtractor?: {
        single?: (paramString: string) => string
        multiple?: (paramString: string) => string
    }
}

/* ------------------------------------------------------------------ */
/* 🔧  Utility helpers                                                 */
/* ------------------------------------------------------------------ */

/** Escape a single character for safe injection into a RegExp. */
const esc = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/* ------------------------------------------------------------------ */
/* 📦  ParamAnalyzer implementation                                   */
/* ------------------------------------------------------------------ */

export class ParamAnalyzer {
    public readonly openTag: string
    public readonly closeTag: string

    /** RegExp generated from {@link openTag} / {@link closeTag}. */
    private readonly generatedShapes: {
        single: RegExp
        multiple: RegExp
    }

    /** @throws `TypeError` if tag characters are invalid. */
    public constructor(public readonly options: ParamAnalyzerConstructor = {}) {
        /* ------------ 1️⃣  resolve + validate tag characters ---------- */
        const open = options.openTag ?? '['
        const close = options.closeTag ?? ']'

        if (open.length !== 1 || close.length !== 1)
            throw new TypeError(
                `openTag / closeTag must be single characters – received "${open}" & "${close}".`
            )
        if (open === close)
            throw new TypeError(
                `openTag and closeTag cannot be the same character ("${open}").`
            )
        if (
            INVALID_PATH_CHARS.includes(open) ||
            INVALID_PATH_CHARS.includes(close)
        )
            throw new TypeError(
                `openTag ("${open}") or closeTag ("${close}") is not allowed in file/folder names.`
            )

        this.openTag = open
        this.closeTag = close

        /* ------------ 2️⃣  create default RegExp shapes --------------- */
        const o = esc(open)
        const c = esc(close)

        this.generatedShapes = {
            // e.g.  "[foo]"  when openTag="[" closeTag="]"
            single: new RegExp(`(${o}[^${o}${c}]+?${c})`),
            // e.g.  "[...bar]"
            multiple: new RegExp(`(${o}\\.\\.\\.[^${o}${c}]+?${c})`),
        }
    }

    /* -------------------------- shapes ---------------------------- */

    /** Dynamic single-param matcher (`[foo]`). */
    private get singleDynamicParamShape(): RegExp {
        return this.options.paramShape?.single || this.generatedShapes.single
    }
    /** Dynamic multi-param matcher (`[...foo]`). */
    private get multipleDynamicParamShape(): RegExp {
        return (
            this.options.paramShape?.multiple || this.generatedShapes.multiple
        )
    }

    /* ----------------------- extractors --------------------------- */

    /** Removes opening/closing tag characters. */
    private readonly defaultSingleExtractor = (paramString: string) =>
        paramString.slice(1, -1) /* remove first/last char */

    /** Removes tags + leading `...` for spread params. */
    private readonly defaultMultipleExtractor = (paramString: string) =>
        paramString
            .slice(1, -1) // strip brackets
            .replace(/^\.\.\./, '') // strip leading "..."
    private get singleParamExtractor() {
        return (
            this.options.paramExtractor?.single || this.defaultSingleExtractor
        )
    }
    private get multipleParamExtractor() {
        return (
            this.options.paramExtractor?.multiple ||
            this.defaultMultipleExtractor
        )
    }

    /* -------------------- public query helpers -------------------- */

    /**
     * `true` → matches the **single** dynamic-param pattern
     * (`[foo]` when default delimiters are used).
     */
    public isSingleDynamicParam(paramString: string): boolean {
        return this.singleDynamicParamShape.test(paramString)
    }

    /**
     * `true` → matches the **spread** dynamic-param pattern
     * (`[...foo]` when default delimiters are used).
     */
    public isMultipleDynamicParam(paramString: string): boolean {
        return this.multipleDynamicParamShape.test(paramString)
    }

    /* ----------------------- core logic --------------------------- */

    private isSingleParamString(paramString: string): boolean {
        const length = paramString.split('/').length
        return length === 1 || length === 0
    }

    /**
     *  analyze param string
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
                `Invalid param string (contains "/"): ${singleParamString}`
            )

        if (
            this.isSingleDynamicParam(singleParamString) &&
            !this.isMultipleDynamicParam(singleParamString)
        ) {
            const paramName = this.singleParamExtractor(singleParamString)
            return { isDynamicParam: true, isMultiple: false, paramName }
        }

        if (this.isMultipleDynamicParam(singleParamString)) {
            const paramName = this.multipleParamExtractor(singleParamString)
            return { isDynamicParam: true, isMultiple: true, paramName }
        }

        return {
            isDynamicParam: false,
            isMultiple: false,
            dividerName: singleParamString,
        }
    }

    /* ------------- helpers for multi-segment analysis ------------- */

    private getValidParamString(paramString: string): string {
        return paramString.split('/').filter(Boolean).join('/')
    }

    private isValidParamStructure(
        paramAnalyzedResult: Array<SingleParamAnalyzeResult>
    ): boolean {
        const spreadIndex = paramAnalyzedResult.findIndex(
            (p) => p.isDynamicParam && p.isMultiple
        )
        if (spreadIndex === -1) return true
        return spreadIndex === paramAnalyzedResult.length - 1
    }

    /**
     * Analyze an entire (possibly multi-segment) parameter path.
     *
     * @returns
     * * `result` – the per-segment analysis list
     * * `dynamicParams` – ordered list of dynamic parameter names
     */
    public analyzeParam(paramString: string): {
        dynamicParams: Array<string>
        result: Array<SingleParamAnalyzeResult>
    } {
        const cleaned = this.getValidParamString(paramString)

        /* ----- single segment ------------------------------------------------ */
        if (this.isSingleParamString(cleaned)) {
            const single = this.analyzeSingleParam(cleaned)
            return {
                result: [single],
                dynamicParams: single.isDynamicParam ? [single.paramName] : [],
            }
        }

        /* ----- multi-segment -------------------------------------------------- */
        const segments = cleaned.split('/').filter(Boolean)
        const result = segments.map((seg) => this.analyzeSingleParam(seg))

        if (!this.isValidParamStructure(result))
            throw new TypeError(
                `Invalid param structure (“${cleaned}”): spread parameter must be last.`
            )

        const dynamicParams = result
            .filter(
                (
                    p
                ): p is Extract<
                    SingleParamAnalyzeResult,
                    { isDynamicParam: true }
                > => p.isDynamicParam
            )
            .map((p) => p.paramName)

        return { result, dynamicParams }
    }
}
