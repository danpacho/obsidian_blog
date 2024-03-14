import type { BuilderPlugin } from './interface'

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type PluginAdapter = Adapter<BuilderPlugin>
