import { PolymorphicMeta } from 'packages/build_system/src/meta/engine'

export type MetaGenerator = (meta: Record<string, unknown>) => PolymorphicMeta

export const ContentMetaGenerator: MetaGenerator = (meta) => ({
    title: 'DEFAULT TITLE',
    description: 'DEFAULT DESCRIPTION',
    update: new Date(),
    ...meta,
})
