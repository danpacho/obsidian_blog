import { type Stateful } from '../../promisify'
import { PrimitiveSchema, type PrimitiveType, type TypeOf } from './primitives'
import { ArgTypeError } from './type.error'

/**
 * Plugin dynamic config primitive type
 */
export type PluginDynamicConfigPrimitiveType = TypeOf<PrimitiveType>
export interface PluginDynamicSchemaType {
    primitive: PrimitiveType
    union: Array<PrimitiveType>
    schema: PluginDynamicConfigSchema
}
interface PluginDynamicSchemaInfo {
    /**
     * The type of the argument
     * @example
     * ```ts
     * type: 'string' // Primitive type
     *
     * type: 'Array<string>' // Array type
     *
     * type: 'Array' // any Array type
     *
     * type: ['string', 'number'] // Union type, string | number
     * ```
     */
    type: PrimitiveType | Array<PrimitiveType> | PluginDynamicConfigSchema
    /**
     * Whether the argument is optional
     */
    optional?: boolean
    /**
     * A description of the argument
     */
    description: string
    /**
     * A description of argument type
     */
    typeDescription?: string
    /**
     * The default value of the argument
     * @optional Optional value
     */
    defaultValue?: PluginDynamicConfigPrimitiveType
}

/**
 * A record of dynamic argument schema
 * @example
 * ```ts
 * const dynamicArgs: ArgSchemaRecord = {
 *     name: {
 *         type: 'Array<string>',
 *         description: 'Names',
 *         defaultValue: ['John Doe'],
 *     },
 * }
 * ```
 * @example
 * ```
 * // Rendered as
 * -------------------------------------
 * [Name]:
 *  - type: Array<string>
 *  - description: Names
 *  - input: ['John Doe']
 * -------------------------------------
 * ```
 */
export interface PluginDynamicConfigSchema {
    [Key: string]: PluginDynamicSchemaInfo
}

export class DynamicConfigParserError extends ArgTypeError {
    public constructor(
        info: { expected: string; received: unknown },
        public readonly schema: PluginDynamicConfigSchema,
        public readonly path: string[] = []
    ) {
        super(info.expected, info.received)
    }
}

export class DynamicConfigParser {
    private $: PrimitiveSchema = PrimitiveSchema.create()

    private assertRecord(
        value: unknown
    ): asserts value is Record<string, unknown> {
        if (!(typeof value === 'object' && !Array.isArray(value))) {
            throw new ArgTypeError('Record<string, unknown>', value)
        }
    }

    /**
     * Parse the given value with the given schema
     * @param schema The schema to parse the value with
     * @param value The value to parse
     */
    public parse<
        Response extends Record<string, unknown> = Record<string, unknown>,
    >(
        schema: PluginDynamicConfigSchema,
        value: Record<string, unknown>,
        _result: Record<string, unknown> = {},
        _path: Array<string> = []
    ): Stateful<Response, DynamicConfigParserError> {
        try {
            for (const key in schema) {
                const schemaValue = schema[key]
                if (!schemaValue) continue

                const targetValue = value[key]

                const isOptional =
                    schemaValue.optional &&
                    (targetValue === undefined || targetValue === null)

                if (isOptional) {
                    if (
                        schemaValue.defaultValue !== undefined &&
                        schemaValue.defaultValue !== null
                    ) {
                        _result[key] = schemaValue.defaultValue
                    }
                    continue
                }

                if (typeof schemaValue.type === 'string') {
                    _path.push(key)
                    this.$.AssertByType(schemaValue.type, targetValue)

                    _result[key] = targetValue
                    _path.pop()
                } else if (Array.isArray(schemaValue.type)) {
                    _path.push(key)
                    const isUnionFound = schemaValue.type.some((type) => {
                        try {
                            this.$.AssertByType(type, targetValue)
                            return true
                        } catch (e) {
                            return false
                        }
                    })

                    if (isUnionFound === false) {
                        throw new DynamicConfigParserError(
                            {
                                expected: schemaValue.type.join(' | '),
                                received: targetValue,
                            },
                            schema,
                            _path
                        )
                    }

                    _result[key] = targetValue
                    _path.pop()
                } else {
                    _path.push(key)
                    this.assertRecord(targetValue)
                    const parsed = this.parse(
                        schemaValue.type,
                        targetValue,
                        {},
                        _path
                    )
                    if (parsed.success) {
                        _path.pop()
                        _result[key] = parsed.data
                    } else {
                        return {
                            error: parsed.error,
                            success: false,
                        }
                    }
                }
            }

            return {
                data: _result as Response,
                success: true,
            }
        } catch (e) {
            const key = _path[_path.length - 1]
            const shouldInjectDefaultValue = Boolean(
                key &&
                    schema[key]?.defaultValue !== undefined &&
                    e instanceof ArgTypeError &&
                    !e?.received
            )

            if (shouldInjectDefaultValue) {
                _result[key!] = schema[key!]!.defaultValue
                return {
                    data: _result as Response,
                    success: true,
                }
            }

            const extractSchemaType = (
                schema: PluginDynamicConfigSchema
            ): Record<string, unknown> =>
                Object.keys(schema).reduce<Record<string, unknown>>(
                    (acc, key) => {
                        const schemaValue = schema[key]
                        if (!schemaValue) return {}

                        if (typeof schemaValue.type === 'string') {
                            const type = schemaValue.optional
                                ? `${schemaValue.type} | undefined`
                                : schemaValue.type
                            acc[key] = type
                            return acc
                        }

                        if (Array.isArray(schemaValue.type)) {
                            const type = schemaValue.optional
                                ? schemaValue.type.join(' | ') + ' | undefined'
                                : schemaValue.type.join(' | ')
                            acc[key] = type
                            return acc
                        }

                        const res = extractSchemaType(schemaValue.type)
                        acc[key] = res
                        return acc
                    },
                    {}
                )

            if (e instanceof ArgTypeError) {
                return {
                    error: new DynamicConfigParserError(
                        {
                            expected: JSON.stringify(
                                extractSchemaType(schema),
                                null,
                                4
                            ),
                            received: e.received,
                        },
                        schema,
                        _path
                    ),
                    success: false,
                }
            }

            return {
                error: new DynamicConfigParserError(
                    {
                        expected: JSON.stringify(
                            extractSchemaType(schema),
                            null,
                            4
                        ),
                        received: value,
                    },
                    schema,
                    _path
                ),
                success: false,
            }
        }
    }
}
