import type { ContentsModifierPlugin, FileTreePlugin } from './interface'

type ListOrSingle<T> = Array<T> | T

export type UsePlugin = {
    'build:file:tree'?: ListOrSingle<FileTreePlugin>
    'build:contents'?: ListOrSingle<ContentsModifierPlugin>
}
