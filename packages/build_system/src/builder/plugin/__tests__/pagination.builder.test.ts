import { describe, expect, it } from 'vitest'
import { PaginationBuilderPlugin, StaticParamBuilderPlugin } from '../core'
import { Tester } from './tester'
import { ExcludeDraftPlugin } from '../core/build_tree/exclude_draft'

describe('StaticParamBuilderPlugin', () => {
    const paginationBuilder = new PaginationBuilderPlugin()

    function omit<T extends Record<string, any>, K extends keyof T>(
        obj: T,
        keyToOmit: K
    ): Omit<T, K> {
        const { [keyToOmit]: _, ...rest } = obj
        return rest
    }

    function pick<T extends Record<string, any>, K extends keyof T>(
        obj: T,
        keyToPick: K
    ): Pick<T, K> {
        const { [keyToPick]: value } = obj
        return { [keyToPick]: value } as Pick<T, K>
    }

    it('should inject static params to the content', async () => {
        const draft = new ExcludeDraftPlugin()
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'build:tree': draft,
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })
        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
            .map((e) => {
                // filter update(live gen time)
                const te = e as unknown as {
                    next: Record<string, unknown>
                    prev: Record<string, unknown>
                }
                const next = pick(omit(te?.next ?? {}, 'update'), 'params')
                const prev = pick(omit(te?.prev ?? {}, 'update'), 'params')
                return {
                    next,
                    prev,
                }
            })
        expect(meta).toStrictEqual([
            {
                next: {
                    params: {
                        page: '1',
                        postId: 'category/series_1',
                    },
                },
                prev: {
                    params: undefined,
                },
            },
            {
                next: {
                    params: {
                        page: '2',
                        postId: 'category/series_2',
                    },
                },
                prev: {
                    params: {
                        page: '1',
                        postId: 'category/category',
                    },
                },
            },
            {
                next: {
                    params: {
                        page: '2',
                        postId: 'img',
                    },
                },
                prev: {
                    params: {
                        page: '1',
                        postId: 'category/series_1',
                    },
                },
            },
            {
                next: {
                    params: {
                        page: '3',
                        postId: 'link',
                    },
                },
                prev: {
                    params: {
                        page: '2',
                        postId: 'category/series_2',
                    },
                },
            },
            {
                next: {
                    params: {
                        page: '3',
                        postId: 'markdown',
                    },
                },
                prev: {
                    params: {
                        page: '2',
                        postId: 'img',
                    },
                },
            },
            {
                next: {
                    params: undefined,
                },
                prev: {
                    params: {
                        page: '3',
                        postId: 'link',
                    },
                },
            },
            {
                next: {
                    params: {
                        page: '5',
                        postId: 'nested/nested/nested',
                    },
                },
                prev: {
                    params: undefined,
                },
            },
            {
                next: {
                    params: {
                        page: '5',
                        postId: 'nested/nested/nested2',
                    },
                },
                prev: {
                    params: {
                        page: '4',
                        postId: 'nested/nested/nested/nested/nested/nested/nested/deeply_nested',
                    },
                },
            },
            {
                next: {
                    params: undefined,
                },
                prev: {
                    params: {
                        page: '5',
                        postId: 'nested/nested/nested',
                    },
                },
            },
        ])
    })

    it('should inject [category]/[...post] param', async () => {
        const draft = new ExcludeDraftPlugin()
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            paramShape: '/[category]/[...post]',
            maxPage: 3,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'build:tree': [draft],
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })

        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
            .map((e) => {
                // filter update(live gen time)
                const te = e as unknown as {
                    next: Record<string, unknown>
                    prev: Record<string, unknown>
                }
                const next = pick(omit(te?.next ?? {}, 'update'), 'params')
                const prev = pick(omit(te?.prev ?? {}, 'update'), 'params')
                return {
                    next,
                    prev,
                }
            })

        expect(meta).toStrictEqual([
            {
                next: {
                    params: {
                        category: 'category',
                        post: 'series_1',
                    },
                },
                prev: {
                    params: undefined,
                },
            },
            {
                next: {
                    params: {
                        category: 'category',
                        post: 'series_2',
                    },
                },
                prev: {
                    params: {
                        category: 'category',
                        post: 'category',
                    },
                },
            },
            {
                next: {
                    params: {
                        category: 'img',
                    },
                },
                prev: {
                    params: {
                        category: 'category',
                        post: 'series_1',
                    },
                },
            },
            {
                next: {
                    params: {
                        category: 'link',
                    },
                },
                prev: {
                    params: {
                        category: 'category',
                        post: 'series_2',
                    },
                },
            },
            {
                next: {
                    params: {
                        category: 'markdown',
                    },
                },
                prev: {
                    params: {
                        category: 'img',
                    },
                },
            },
            {
                next: {
                    params: undefined,
                },
                prev: {
                    params: {
                        category: 'link',
                    },
                },
            },
            {
                next: {
                    params: {
                        category: 'nested',
                        post: 'nested/nested',
                    },
                },
                prev: {
                    params: undefined,
                },
            },
            {
                next: {
                    params: {
                        category: 'nested',
                        post: 'nested/nested2',
                    },
                },
                prev: {
                    params: {
                        category: 'nested',
                        post: 'nested/nested/nested/nested/nested/nested/deeply_nested',
                    },
                },
            },
            {
                next: {
                    params: undefined,
                },
                prev: {
                    params: {
                        category: 'nested',
                        post: 'nested/nested',
                    },
                },
            },
        ])
    })
})
