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
    //TODO: move it to .env dotenv might need it
    const ROOT =
        '/Users/june/Documents/plugin_test/.obsidian/plugins/obsidian-blogger' as const

    lg.log('Hot reload started')
    lg.log(`Building plugin at ${ROOT}`)
    const cpRes = await io.cpFile({
        from: `${process.cwd()}/dist/main.js`,
        to: `${ROOT}/main.js`,
    })
    await io.cpFile({
        from: `${process.cwd()}/manifest.json`,
        to: `${ROOT}/manifest.json`,
    })

    await io.writer.write({
        data: '',
        filePath: `${ROOT}/.hotreload`,
    })

    if (!cpRes.success) {
        lg.error(JSON.stringify(cpRes.error, null, 2))
        return
    }

    lg.log('Hot reload completed')
}

const WATCH_ROOT = `${process.cwd()}/src/plugin/main.ts`
lg.info(`Plugin build started at ${WATCH_ROOT}`)
const watcher = new Watcher(WATCH_ROOT)

watcher.on('change', async () => {
    lg.info('Plugin changed')
    await HotReload()
})
