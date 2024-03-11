// import { prettyPrint } from '../../../utils/logger'
import type { BuilderPlugin } from '../../../../plugin'
import type { DefaultContentMeta } from './constant'
export type MetaParser = Parameters<
    Parameters<BuilderPlugin['build:contents']>[0]['metaEngine']
>[0]['parser']

const is = {
    Object: (input: unknown): input is Record<string, unknown> =>
        typeof input === 'object' && input !== null,
    String: (value: unknown): value is string => typeof value === 'string',
    Date: (value: unknown): value is Date => value instanceof Date,
    StringArray: (value: unknown): value is string[] =>
        Array.isArray(value) && value.every((item) => is.String(item)),
}

export const ContentMetaParser: MetaParser = (input: unknown) => {
    if (!is.Object(input)) {
        throw new TypeError('input must be a non-null object')
    }

    const { title, description, update, category, tags } = input as Record<
        string,
        unknown
    >

    if (!is.String(title)) {
        throw new TypeError('title is required and must be a string')
    }
    if (!is.String(description)) {
        throw new TypeError('description is required and must be a string')
    }

    const output: ReturnType<MetaParser> = {
        title,
        description,
    } satisfies DefaultContentMeta

    if (update !== undefined) {
        if (!is.Date(update)) {
            throw new TypeError('update, if provided, must be a Date object')
        }
        output.update = update
    }

    if (category !== undefined) {
        if (!is.String(category)) {
            throw new TypeError('category, if provided, must be a string')
        }
        output.category = category
    }

    if (tags !== undefined) {
        if (!is.StringArray(tags)) {
            throw new TypeError(
                'tags, if provided, must be an array of strings'
            )
        }
        output.tags = tags
    }

    const withUnknownMeta = {
        ...input,
        ...output,
    }

    return withUnknownMeta
}
