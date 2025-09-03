import { describe, expect, it } from 'vitest'

import { ObsidianReferencePlugin } from '../core'

import { Tester } from './tester'

describe('ObsidianReferencePlugin', () => {
    const plugin = new ObsidianReferencePlugin()
    it('should reference obsidian images', async () => {
        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
            cleanupDist: true,
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)
    })

    it('should handle image MOVED status automatic reference update', async () => {
        await Tester.transactions.move(plugin.name, {
            oldFilePath: 'img.png',
            newFilePath: 'assets/img.png',
        })

        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
            cleanupDist: false,
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)
    })

    it('should handle image UPDATE status automatic reference update', async () => {
        await Tester.transactions.updateSize(plugin.name, {
            filePath: 'assets/img.png',
            reduceByPercent: 10,
        })

        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
            cleanupDist: false,
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)
    })

    it('should handle image ADD status automatic reference update', async () => {
        await Tester.transactions.update(plugin.name, {
            filePath: 'img.md',
            newContent(prev) {
                const newFile = `${prev}\n8. Added image : \n   ![[added_img.png#outline|Cover|200x1000]]`
                return newFile
            },
        })
        await Tester.transactions.add(plugin.name, {
            filePath: 'added_img.png',
            content: ``,
        })

        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
            cleanupDist: false,
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)

        // Newly written property
        expect(content).toContain(`height="1000px"`)
    })

    it('should handle image REMOVED status automatic reference update', async () => {
        await Tester.transactions.remove(plugin.name, {
            filePath: 'assets/img.png',
        })

        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
            cleanupDist: false,
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)
    })
})
