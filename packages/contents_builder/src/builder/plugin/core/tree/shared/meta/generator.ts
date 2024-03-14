import type { BuilderPlugin } from '../../../..'
import { ContentMetaDefaultValueInjector } from './constant'

export type MetaGenerator = Exclude<
    Parameters<
        Parameters<BuilderPlugin['build:contents']>[0]['meta']
    >[0]['generator'],
    undefined
>

export const ContentMetaGenerator: MetaGenerator = (meta) => ({
    ...ContentMetaDefaultValueInjector(),
    ...meta,
})
