/* eslint-disable @typescript-eslint/ban-types */
import { ArgTypeError } from './type.error'

/**
 * @description Primitive list for supporting dynamic configuration setup
 */
export type PrimitiveType = Primitives | 'Array' | `Array<${Primitives}>`
export type Primitives =
    | 'int'
    | 'number'
    | 'string'
    | 'boolean'
    | `Literal<${string}>`
    | 'Function'
    | 'RegExp'
    | 'NULL'

type ParseType<T extends Primitives> = T extends 'number'
    ? number
    : T extends 'int'
      ? number
      : T extends 'string'
        ? string
        : T extends 'boolean'
          ? boolean
          : T extends 'NULL'
            ? null
            : T extends `Literal<${infer U}>`
              ? U extends string
                  ? U
                  : never
              : T extends 'Function'
                ? /* eslint-disable @typescript-eslint/no-explicit-any */
                  (...args: any[]) => any | Promise<any>
                : T extends 'RegExp'
                  ? RegExp
                  : never

/**
 * Parse the type name to the actual type
 */
export type TypeOf<T extends PrimitiveType> = T extends 'Array'
    ? Array<unknown>
    : T extends `Array<${infer U}>`
      ? U extends Primitives
          ? Array<ParseType<U>>
          : never
      : T extends Primitives
        ? ParseType<T>
        : never

export class PrimitiveSchema {
    private constructor() {}
    private static instance: PrimitiveSchema
    public static create(): PrimitiveSchema {
        return (
            PrimitiveSchema.instance ||
            (PrimitiveSchema.instance = new PrimitiveSchema())
        )
    }
    /**
     * Asserts that the value is a `number`
     */
    public AssertNumber(value: unknown): asserts value is number {
        const isNumber = typeof value === 'number' && !isNaN(value)
        if (!isNumber) throw new ArgTypeError('number', value)
    }
    /**
     * Asserts that the value is an `integer`
     */
    public AssetInt(value: unknown): asserts value is number {
        this.AssertNumber(value)
        const isInt = Number.isInteger(value)
        if (!isInt) throw new ArgTypeError('int', value)
    }

    /**
     * Asserts that the value is `null`
     */
    public AssertNull(value: unknown): asserts value is null {
        const isNull = value === null
        if (!isNull) throw new ArgTypeError('null', value)
    }

    /**
     * Asserts that the value is a `string`
     */
    public AssertString(value: unknown): asserts value is string {
        const isString = typeof value === 'string'
        if (!isString) throw new ArgTypeError('string', value)
    }
    /**
     * Asserts that the value is a `boolean`
     */
    public AssertBoolean(value: unknown): asserts value is boolean {
        const isBoolean = typeof value === 'boolean'
        if (!isBoolean) throw new ArgTypeError('boolean', value)
    }
    /**
     * Asserts that the value is a `function`
     */
    public AssertFunction(
        value: unknown
    ): asserts value is (...args: unknown[]) => unknown {
        const isFunction = typeof value === 'function'
        if (!isFunction) throw new ArgTypeError('function', value)
    }
    /**
     * Asserts that the value is a `RegExp`
     */
    public AssertRegExp(value: unknown): asserts value is RegExp {
        const isRegExp = value instanceof RegExp
        if (!isRegExp) throw new ArgTypeError('RegExp', value)
    }
    /**
     * Asserts that the value is an `array`
     */
    public AssertArray(value: unknown): asserts value is unknown[] {
        const isArray = Array.isArray(value)
        if (!isArray) throw new ArgTypeError('array', value)
    }

    /**
     * Asserts that the value is of the given type
     * @param type TypeName of the value to assert
     * @param value The value to assert
     */
    public AssertByType<TypeName extends PrimitiveType>(
        type: TypeName,
        value: unknown
    ): asserts value is TypeOf<TypeName> {
        switch (type) {
            case 'number':
                this.AssertNumber(value)
                break
            case 'int':
                this.AssetInt(value)
                break
            case 'string':
                this.AssertString(value)
                break
            case 'boolean':
                this.AssertBoolean(value)
                break
            case 'NULL':
                this.AssertNull(value)
                break
            case 'Function':
                this.AssertFunction(value)
                break
            case 'Array':
                this.AssertArray(value)
                break
            case 'RegExp':
                this.AssertRegExp(value)
                break

            default:
                if (type.startsWith('Array')) {
                    const innerType = type
                        .slice(5)
                        .replaceAll(/[<>]/g, '') as Primitives
                    this.AssertArrayStrict(innerType, value)
                } else if (type.startsWith('Literal')) {
                    const literalName = type
                        .slice(8)
                        .replaceAll(/[<>]/g, '') as string
                    const literal = Number.isNaN(Number(literalName))
                        ? String(literalName)
                        : Number(literalName)

                    if (
                        typeof literal === 'number' &&
                        Number(value) !== literal
                    ) {
                        throw new ArgTypeError(literalName, value)
                    } else if (
                        typeof literal === 'string' &&
                        String(value) !== literal
                    ) {
                        throw new ArgTypeError(literalName, value)
                    }
                } else {
                    throw new ArgTypeError('unknown', value)
                }
        }
    }

    /**
     * Asserts that the value is an array of the given type
     * @param type TypeName of the array
     * @param value The value to assert
     */
    public AssertArrayStrict<TypeName extends Primitives>(
        type: TypeName,
        value: unknown
    ): asserts value is Array<ParseType<TypeName>> {
        this.AssertArray(value)
        value.forEach((v) => this.AssertByType(type, v))
    }
}
