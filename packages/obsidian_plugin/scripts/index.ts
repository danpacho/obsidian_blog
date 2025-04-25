#!/usr/bin/env node

// 1) Programmatically load the monorepo .env
import { config } from 'dotenv'
import path from 'path'
import { io, lg } from 'utils'
import Watcher from 'watcher'
import { generateManifest } from './generateManifest'

// Assuming you invoke this script from the package root,
// process.cwd() === ".../packages/obsidian_plugin"
const envPath = path.resolve(process.cwd(), '../../.env')
config({ path: envPath })

// 2) Now you can read DEV_VAULT_ROOT reliably:
const DEV_VAULT_ROOT = process.env.DEV_VAULT_ROOT
if (!DEV_VAULT_ROOT) {
    lg.error(`Missing DEV_VAULT_ROOT in .env at ${envPath}`)
    process.exit(1)
}

// , '../')
const WATCH_ROOT = path.resolve(process.cwd())

// 4) Generate the manifest once
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

// 5) Define what to copy on each reload
const COPY_LIST = [
    ['dist/main.js', 'main.js'],
    ['manifest.json', 'manifest.json'],
    ['dist/styles.css', 'styles.css'],
] as const

async function hotReload() {
    lg.log('Hot reload started')

    for (const [srcRel, destName] of COPY_LIST) {
        const from = path.join(process.cwd(), srcRel)
        const to = path.join(DEV_VAULT_ROOT!, destName)
        await io.cpFile({
            from,
            to,
        })
    }

    // Touch the flag so Obsidian knows to reload
    await io.writer.write({
        filePath: path.join(DEV_VAULT_ROOT!, '.hotreload'),
        data: '',
    })
    lg.log('Hot reload completed')
}

// 6) Kick off an initial deploy and then watch for changes
hotReload().catch((err) =>
    lg.error(`Initial hotReload failed ${JSON.stringify(err, null, 4)}`)
)

lg.info(`Plugin build started at ${WATCH_ROOT}`)
const watcher = new Watcher(WATCH_ROOT, { recursive: true })

watcher.on('change', async (changedPath) => {
    lg.info(`Change detected: ${changedPath}`)
    try {
        await hotReload()
    } catch (err) {
        lg.error(`HotReload failed: ${JSON.stringify(err, null, 4)}`)
    }
})
