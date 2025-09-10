import { beforeEach, describe, expect, it } from 'vitest'

import { AudioFileNode, FolderNode, ImageFileNode, TextFileNode } from '../node'

describe('FileTreeNode and FolderNode', () => {
    let root: FolderNode
    let docs: FolderNode
    let images: FolderNode
    let guide: TextFileNode
    let photo: ImageFileNode
    let readme: TextFileNode
    let audio: AudioFileNode

    beforeEach(() => {
        // [AST]
        //
        // / (root)
        // ├── docs/
        // │   └── guide.md
        // ├── images/
        // │   └── photo.png
        // │   └── sound.mp3
        // └── README.md
        root = new FolderNode('/root', 0)
        docs = new FolderNode('/root/docs', 1)
        images = new FolderNode('/root/images', 1)
        readme = new TextFileNode('/root/README.md', 1)
        guide = new TextFileNode('/root/docs/guide.md', 2)
        photo = new ImageFileNode('/root/images/photo.png', 2)
        audio = new AudioFileNode('/root/images/sound.mp3', 2)

        root.addChild(docs)
        root.addChild(images)
        root.addChild(readme)
        docs.addChild(guide)
        images.addChild(photo)
        images.addChild(audio)
    })

    describe('FileTreeNode Helpers', () => {
        it('should correctly identify folder and leaf nodes', () => {
            expect(root.isFolder()).toBe(true)
            expect(docs.isFolder()).toBe(true)
            expect(guide.isFolder()).toBe(false)
            expect(guide.isLeaf()).toBe(true)
            expect(photo.isLeaf()).toBe(true)
        })

        it('should correctly retrieve the parent node', () => {
            expect(docs.getParentNode()).toBe(root)
            expect(guide.getParentNode()).toBe(docs)
            expect(root.getParentNode()).toBeUndefined()
        })

        it('should get ancestors correctly', () => {
            expect(guide.getAncestors()).toEqual([docs, root])
            expect(docs.getAncestors()).toEqual([root])
            expect(root.getAncestors()).toEqual([])
        })

        it('should get path from root correctly', () => {
            expect(guide.getPathFromRoot()).toEqual([root, docs, guide])
            expect(root.getPathFromRoot()).toEqual([root])
        })

        it('should compute depth correctly', () => {
            expect(guide.getComputedDepth()).toBe(2)
            expect(docs.getComputedDepth()).toBe(1)
            expect(root.getComputedDepth()).toBe(0)
        })

        it('should correctly check ancestor/descendant relationships', () => {
            expect(root.isAncestorOf(guide)).toBe(true)
            expect(docs.isAncestorOf(guide)).toBe(true)
            expect(guide.isDescendantOf(root)).toBe(true)
            expect(images.isAncestorOf(guide)).toBe(false)
            expect(guide.isDescendantOf(images)).toBe(false)
        })

        it('should check equality by absolute path', () => {
            const anotherGuide = new TextFileNode('/root/docs/guide.md', 2)
            expect(guide.equals(anotherGuide)).toBe(true)
            expect(guide.equals(photo)).toBe(false)
        })
    })

    describe('FolderNode Mutations', () => {
        it('should add a child correctly', () => {
            const newFile = new TextFileNode('/root/new.md', 1)
            root.addChild(newFile)
            expect(root.children).toContain(newFile)
            expect(newFile.getParentNode()).toBe(root)
            expect(root.children.length).toBe(4)
        })

        it('should remove a child correctly', () => {
            const childCount = root.children.length
            const result = root.removeChild(docs)
            expect(result).toBe(true)
            expect(root.children).not.toContain(docs)
            expect(docs.getParentNode()).toBeUndefined()
            expect(root.children.length).toBe(childCount - 1)
        })

        it('should move a child to another folder', () => {
            // Move guide.md from /docs to /images
            docs.moveChildTo(guide, images)
            expect(docs.children).not.toContain(guide)
            expect(images.children).toContain(guide)
            expect(guide.getParentNode()).toBe(images)
        })

        it('should prevent moving a node into its own descendant (cycle)', () => {
            // Attempt to add `root` as a child of `docs`. This would create a cycle.
            const addResult = docs.addChild(root)
            expect(addResult).toBe(false)

            // Create a new folder inside `docs`
            const subDocs = new FolderNode('/root/docs/sub', 3)
            docs.addChild(subDocs)

            // Attempt to move `docs` into `subDocs`. This would also create a cycle.
            const moveResult = root.moveChildTo(docs, subDocs)
            expect(moveResult).toBe(false)
        })

        it('should replace a child', () => {
            const newReadme = new TextFileNode('/root/NEW_README.md', 1)
            const result = root.replaceChild(readme, newReadme)
            expect(result).toBe(true)
            expect(root.children).toContain(newReadme)
            expect(root.children).not.toContain(readme)
            expect(newReadme.getParentNode()).toBe(root)
            expect(readme.getParentNode()).toBeUndefined()
        })

        it('should re-parent a node when addChild is called', () => {
            // Move `photo` from `images` to `docs`
            docs.addChild(photo)
            expect(images.children).not.toContain(photo)
            expect(docs.children).toContain(photo)
            expect(photo.getParentNode()).toBe(docs)
        })
    })

    describe('FolderNode Traversal and Queries', () => {
        it('should traverse in DFS order', () => {
            const visited = [...root.traverseDFS()].map((n) => n.fileName)
            const expectedOrder = [
                'root',
                'docs',
                'guide.md',
                'images',
                'photo.png',
                'sound.mp3',
                'README.md',
            ]
            expect(visited).toEqual(expectedOrder)
        })

        it('should traverse in BFS order', () => {
            const visited = [...root.traverseBFS()].map((n) => n.fileName)
            const expectedOrder = [
                'root',
                'docs',
                'images',
                'README.md',
                'guide.md',
                'photo.png',
                'sound.mp3',
            ]
            expect(visited).toEqual(expectedOrder)
        })

        it('should find a node by predicate', () => {
            const found = root.find((node) => node.fileName === 'photo.png')
            expect(found).toBe(photo)
        })

        it('should find all nodes by predicate', () => {
            const textFiles = root.findAll(
                (node) => node instanceof TextFileNode
            )
            expect(textFiles).toHaveLength(2)
            expect(textFiles).toContain(readme)
            expect(textFiles).toContain(guide)
        })

        it('should get all descendants', () => {
            const descendants = root.getDescendants()
            expect(descendants).toHaveLength(6)
            expect(descendants).not.toContain(root)
        })

        it('should get all leaf nodes', () => {
            const leaves = root.getLeaves()
            expect(leaves).toHaveLength(4)
            expect(leaves).toContain(guide)
            expect(leaves).toContain(photo)
            expect(leaves).toContain(readme)
            expect(leaves).toContain(audio)
        })

        it('should report correct size', () => {
            expect(root.size()).toBe(7)
            expect(images.size()).toBe(3)
        })
    })

    describe('Typed File Nodes', () => {
        it('TextFileNode should correctly identify itself', () => {
            expect(guide.isTextFile()).toBe(true)
            expect(guide.matchesExtension('md')).toBe(true)
            expect(guide.matchesExtension('png')).toBe(false)
            //@ts-expect-error
            expect(photo.isTextFile).toBeUndefined()
        })

        it('ImageFileNode should correctly identify itself', () => {
            expect(photo.isImageFile()).toBe(true)
            expect(photo.matchesExtension('png')).toBe(true)
            expect(photo.matchesExtension('md')).toBe(false)
            //@ts-expect-error
            expect(guide.isImageFile).toBeUndefined()
        })

        it('AudioFileNode should correctly identify itself', () => {
            expect(audio.isAudioFile()).toBe(true)
            expect(audio.matchesExtension('mp3')).toBe(true)
            expect(audio.matchesExtension('wav')).toBe(false)
            //@ts-expect-error
            expect(guide.isAudioFile).toBeUndefined()
        })
    })
})
