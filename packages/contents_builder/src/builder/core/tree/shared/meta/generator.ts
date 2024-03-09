import type { BuilderPlugin } from '../../../../plugin'
import { MetaRequiredDefaultValue } from './constant'

export type MetaGenerator = Exclude<
    Parameters<
        Parameters<BuilderPlugin['build:contents']>[0]['metaEngine']
    >[0]['generator'],
    undefined
>

export const ContentMetaGenerator: MetaGenerator = (meta) => ({
    ...MetaRequiredDefaultValue(),
    ...meta,
})
