import { cwd } from 'process'
import { describe, expect, it } from 'vitest'
import {
    DependencyTable,
    type DependencyTableConfig,
    type Pkg,
} from '../core/deps_storage'

describe('DependencyTable', () => {
    const config: DependencyTableConfig = {
        recordRoot: `${cwd()}/packages/obsidian_plugin/src/__tests__/__mocks__`,
    }
    const dependencyTable = new DependencyTable(config)

    it('should LOAD package dependencies from storage file', async () => {
        await dependencyTable.load()
        expect(dependencyTable.status).toBe('idle')
    })

    it('should SAVE package dependencies to storage file', async () => {
        await dependencyTable.save()
        expect(dependencyTable.status).toBe('saved')
    })

    it('should SET a package in the DependencyTable', () => {
        const pkgs: Array<Pkg> = Array.from({ length: 10 }, (_, i) => {
            return {
                name: `example-package-${i}`,
                version: '1.0.0',
            }
        })
        pkgs.forEach((pkg) => dependencyTable.set(pkg))
        expect(dependencyTable.status).toBe('updated')
    })

    it('should DELETE a package from the DependencyTable', () => {
        const pkg: Pkg = {
            name: 'example-package-1',
            version: '1.0.0',
        }
        const res = dependencyTable.delete(pkg)
        expect(dependencyTable.status).toBe('updated')
        expect(res).toBe(true)
    })

    it('should not DELETE an unknown package from the DependencyTable', () => {
        const pkg: Pkg = {
            name: 'nope-package-1',
            version: '1.0.0',
        }
        const res = dependencyTable.delete(pkg)
        expect(dependencyTable.status).toBe('updated')
        expect(res).toBe(false)
    })

    it('should SAVE package dependencies to storage file', async () => {
        await dependencyTable.save()
        expect(dependencyTable.status).toBe('saved')
    })

    // it('should clear all package dependencies from the DependencyTable', () => {
    //     dependencyTable.clear()
    //     expect(dependencyTable.status).toBe('idle')
    // })
})
