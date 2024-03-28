#!/bin/env node
import Watcher from 'watcher'
import { io, lg } from '../utils'
import { generateManifest } from './generateManifest'

generateManifest({
    name: 'Obsidian-Blogger',
    description:
        'A plugin that allows you to publish your Obsidian notes to Blogger',
    id: 'obsidian-blogger',
    minAppVersion: '0.1.0',
    version: '0.1.0',
    author: 'danpacho',
    isDesktopOnly: true,
})

const HotReload = async () => {
    lg.log('Hot reload started')

    const cpRes = await io.cpFile({
        from: `${process.cwd()}/dist/main.js`,
        to: `${process.cwd()}/out/.plugin/main.js`,
    })

    if (!cpRes.success) {
        lg.error(JSON.stringify(cpRes.error, null, 2))
        return
    }

    lg.log('Hot reload completed')
}

const c = `${process.cwd()}/src/index.ts`
lg.info(`Plugin build started at ${c}`)
const watcher = new Watcher(c)

watcher.on('change', async () => {
    lg.info('Plugin changed')
    await HotReload()
})
