export const MetaField: {
    required: readonly string[]
    optional: readonly string[]
} = {
    required: ['title', 'description'],
    optional: ['update', 'category', 'tags'],
}

export interface DefaultMeta {
    title: string
    description: string
    update?: Date
    category?: string
    tags?: Array<string>
}

export const MetaRequiredDefaultValue = () => ({
    title: 'DEFAULT TITLE',
    description: 'DEFAULT DESCRIPTION',
    update: new Date(),
})
