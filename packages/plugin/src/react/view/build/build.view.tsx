import { Bridge } from '@obsidian_blogger/constants'
import { useState } from 'react'
import { BuildBridgeStorage } from '~/core/bridge.storage'
import { Button, Loader, Universal } from '~/react/common'
import { useApp } from '~/react/provider/app.root'
import { shell } from '~/utils'

const root = `${process.cwd()}/packages/plugin/src/core/__fixtures__` as const

const buildStore = BuildBridgeStorage.create({
    bridgeRoot: root,
    storePrefix: Bridge.STORE_PREFIX.buildSystem,
    configNames: Object.values(Bridge.MANAGER_NAME.buildSystem),
})

const publishStore = BuildBridgeStorage.create({
    bridgeRoot: root,
    storePrefix: Bridge.STORE_PREFIX.publishSystem,
    configNames: Object.values(Bridge.MANAGER_NAME.publishSystem),
})

/**
 * @example
 * ```bash
 * # Run create command
 * create-obsidian-blogger
 *      "${bridge_root}"
 *      "${obsidian_vault_root}"
 *      "${blog_root}"
 *      "${blog_root}/static/assets"
 *      "${blog_root}/static/md"
 * ```
 */
const createBloggerBridge = async (nodeBin: string) => {
    const nodePath = `${nodeBin}/node`
    const npxPath = `${nodeBin}/npx`

    const res = await shell.spawn$(
        nodePath,
        [npxPath, 'create-obsidian-blogger', '--version'],
        {
            env: {
                PATH: `${process.env.PATH}:${nodeBin}`,
            },
        }
    )
    return res
}

export function BuildView() {
    const app = useApp()

    const [counter, setCounter] = useState(0)

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border border-stone-700 bg-stone-800 p-2 text-white">
                {counter}
            </div>
            <Loader size="size-4" />
            {/* <input type="text"></input> */}
            <button>aaa</button>
            <div className="flex w-full flex-row items-center justify-center gap-2">
                <Button type="success" onClick={() => setCounter((c) => c + 1)}>
                    Plus
                </Button>
                <Button type="warn" onClick={() => setCounter((c) => c - 1)}>
                    Minus
                </Button>
            </div>
            <Universal
                tw={{
                    backgroundColor: 'bg-red-50',
                }}
                as="input"
                type="checkbox"
                onChange={(e) => console.log(e.target.checked)}
            />

            <Button
                onClick={async () => {
                    const path = await shell.exec$('ls -al')
                    console.log(path)
                    const nodeBin =
                        '/Users/june/.nvm/versions/node/v20.11.0/bin' as const
                    const res = await createBloggerBridge(nodeBin)
                    console.log(res)
                }}
            >
                Install
            </Button>
        </div>
    )
}
