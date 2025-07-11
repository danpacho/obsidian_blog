import path from 'path'

import { describe, expect, it } from 'vitest'

import { PathResolver } from '../path_resolver'

describe('PathResolver', () => {
    const resolver = new PathResolver()

    describe('normalize', () => {
        it('should normalize path separators', () => {
            const input = 'foo//bar\\baz/../qux'
            expect(resolver.normalize(input)).toBe(path.normalize(input))
        })
    })

    describe('resolve', () => {
        it('should resolve multiple path segments', () => {
            const result = resolver.resolve('foo', 'bar', '..', 'baz.txt')
            expect(result).toBe(path.resolve('foo', 'bar', '..', 'baz.txt'))
        })
    })

    describe('getExtension', () => {
        it('should get the file extension without dot', () => {
            expect(resolver.getExtension('foo/bar/baz.txt')).toBe('txt')
            expect(resolver.getExtension('foo/bar/baz.tar.gz')).toBe('gz')
        })
        it('should return undefined if no extension', () => {
            expect(resolver.getExtension('foo/bar/baz')).toBeUndefined()
        })
        it('should handle hidden files', () => {
            expect(resolver.getExtension('.env')).toBeUndefined()
            expect(resolver.getExtension('foo/.env.local')).toBe('local')
        })
    })

    describe('getFileNameWithExtension', () => {
        it('should return the file name with extension', () => {
            expect(resolver.getFileNameWithExtension('foo/bar/baz.txt')).toBe(
                'baz.txt'
            )
            expect(resolver.getFileNameWithExtension('foo/bar/baz')).toBe('baz')
            expect(resolver.getFileNameWithExtension('foo/bar/.env')).toBe(
                '.env'
            )
        })
    })

    describe('getFileName', () => {
        it('should return the file name without extension', () => {
            expect(resolver.getFileName('foo/bar/baz.txt')).toBe('baz')
            expect(resolver.getFileName('foo/bar/baz.tar.gz')).toBe('baz.tar')
            expect(resolver.getFileName('foo/bar/baz')).toBe('baz')
            expect(resolver.getFileName('foo/bar/.env')).toBe('.env')
        })
    })

    describe('getRelativePath', () => {
        it('should return the relative path from one to another', () => {
            const from = path.join('foo', 'bar')
            const to = path.join('foo', 'baz', 'qux.txt')
            expect(resolver.getRelativePath(from, to)).toBe(
                path.relative(from, to)
            )
        })
    })

    describe('removeExtension', () => {
        it('should remove the file extension', () => {
            expect(resolver.removeExtension('foo/bar/baz.txt')).toBe(
                path.normalize('foo/bar/baz')
            )
            expect(resolver.removeExtension('foo/bar/baz')).toBe('foo/bar/baz')
            expect(resolver.removeExtension('foo/bar/baz.tar.gz')).toBe(
                path.normalize('foo/bar/baz.tar')
            )
        })
        it('should handle hidden files', () => {
            expect(resolver.removeExtension('.env')).toBe('.env')
            expect(resolver.removeExtension('.env.local')).toBe('.env')
        })
    })

    describe('splitToPathSegments', () => {
        it('should split path into segments without extension', () => {
            const segments = resolver.splitToPathSegments('foo/bar/baz.txt')
            expect(segments).toEqual(['foo', 'bar', 'baz'])
        })
        it('should handle root paths', () => {
            const root = path.sep
            expect(resolver.splitToPathSegments(root)).toEqual([])
        })
    })

    describe('join', () => {
        it('should join multiple paths', () => {
            expect(resolver.join('foo', 'bar', 'baz.txt')).toBe(
                path.join('foo', 'bar', 'baz.txt')
            )
        })
    })
})
