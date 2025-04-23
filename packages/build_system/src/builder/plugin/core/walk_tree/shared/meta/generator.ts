import { PolymorphicMeta } from 'packages/build_system/src/meta/engine'
import { ContentMetaDefaultValueInjector } from './interface'

export type MetaGenerator = (meta: Record<string, unknown>) => PolymorphicMeta

export const ContentMetaGenerator: MetaGenerator = (meta) => ({
    ...ContentMetaDefaultValueInjector(),
    ...meta,
})
