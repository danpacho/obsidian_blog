import type { DefaultCategoryMeta, DefaultContentMeta } from './interface'
import type { PolymorphicMeta } from 'packages/build_system/src/meta/engine'

export type MetaParser = (meta: unknown) => PolymorphicMeta

const Is = {
    Object: (input: unknown): input is Record<string, unknown> =>
        typeof input === 'object' && input !== null,
    String: (value: unknown): value is string => typeof value === 'string',
    Date: (value: unknown): value is Date => value instanceof Date,
    Array: <T>(
        value: unknown,
        check: (item: unknown) => item is T
    ): value is T[] => Array.isArray(value) && value.every(check),
}

const IsContentMeta = (input: unknown): input is DefaultContentMeta => {
    if (!Is.Object(input)) return false

    const { title, description, update, category, tags } =
        input as unknown as DefaultContentMeta

    if (!Is.String(title) || !Is.String(description)) return false
    if (update !== undefined && !Is.Date(update)) return false
    if (category !== undefined && !Is.String(category)) return false
    if (tags !== undefined && !Is.Array(tags, Is.String)) return false

    return true
}

const prettyPrint = (input: unknown): string => JSON.stringify(input, null, 2)

export const ContentMetaParser: MetaParser = (input: unknown) => {
    if (!IsContentMeta(input)) {
        throw new TypeError(
            `content meta error: invalid input, check ${prettyPrint(input)}`
        )
    }

    const { title, description, update, category, tags } = input

    const output: ReturnType<MetaParser> = {
        title,
        description,
    } satisfies DefaultContentMeta

    if (update !== undefined) output.update = update
    if (category !== undefined) output.category = category
    if (tags !== undefined) output.tags = tags

    const withUnknownMeta = {
        ...input,
        ...output,
    }

    return withUnknownMeta
}

export const IsCategoryMeta = (
    input: unknown
): input is DefaultCategoryMeta => {
    if (!Is.Object(input)) return false

    const { title, description, postCollection } =
        input as unknown as DefaultCategoryMeta

    if (!Is.String(title) || !Is.String(description)) return false
    if (!Is.Array(postCollection, IsContentMeta)) return false

    return true
}

export const CategoryMetaParser: MetaParser = (input: unknown) => {
    if (!IsCategoryMeta(input)) {
        throw new TypeError(
            `content meta error: invalid input, check ${prettyPrint(input)}`
        )
    }
    const { title, description, postCollection } = input

    return {
        title,
        description,
        postCollection,
    }
}
