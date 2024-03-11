export const ContentMetaField = {
    required: ['title', 'description'],
    optional: ['update', 'category', 'tags'],
    build: ['params', 'pagination'],
} as const

type UndefinableString = string | undefined
export interface DefaultPaginationInfo {
    href: UndefinableString
    title: UndefinableString
    description: UndefinableString
}

export interface DefaultContentMeta {
    title: string
    description: string
    update?: Date
    category?: string
    tags?: Array<string>
    params?: Record<string, string>
    pagination?: {
        prev: DefaultPaginationInfo
        next: DefaultPaginationInfo
    }
}

export const ContentMetaDefaultValueInjector = () => ({
    title: 'DEFAULT TITLE',
    description: 'DEFAULT DESCRIPTION',
    update: new Date(),
})

export interface DefaultCategoryMeta {
    title: string
    description: string
}
