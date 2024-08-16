import { Bridge } from '@obsidian_blogger/constants'
import React, { useEffect, useRef, useState } from 'react'
import { BuildBridgeStorage } from '../../core/bridge.storage'
import { useObsidianSetting } from '../hooks/use.setting'

export const BUILD_STORE_KEYS = Object.values(Bridge.MANAGER_NAME.buildSystem)
export const PUBLISH_STORE_KEYS = Object.values(
    Bridge.MANAGER_NAME.publishSystem
)

export interface StoreKeys {
    Build: readonly Exclude<
        (typeof BUILD_STORE_KEYS)[number],
        'build_system::internal'
    >[]
    Publish: typeof PUBLISH_STORE_KEYS
}

const StoreContext = React.createContext<{
    build: BuildBridgeStorage<StoreKeys['Build']> | null
    publish: BuildBridgeStorage<StoreKeys['Publish']> | null
    storeLoaded: boolean
}>({
    build: null,
    publish: null,
    storeLoaded: false,
})

/**
 * Use build, publish bridge store
 */
export const useStore = () => {
    const context = React.useContext(StoreContext)
    if (!context) {
        throw new Error('useStore must be used within a <StoreProvider>')
    }
    return context
}

export const StoreProvider = (props: React.PropsWithChildren) => {
    const buildStore = useRef<BuildBridgeStorage<StoreKeys['Build']> | null>(
        null
    )
    const publishStore = useRef<BuildBridgeStorage<
        StoreKeys['Publish']
    > | null>(null)

    const { loaded, settings } = useObsidianSetting()

    const [storeLoaded, setStoreLoaded] = useState<boolean>(false)

    useEffect(() => {
        if (!settings) return
        if (!loaded) return

        const initializeStore = async () => {
            const bridgeRoot = settings.bridge_install_root
            buildStore.current = BuildBridgeStorage.create({
                bridgeRoot,
                storePrefix: Bridge.STORE_PREFIX.buildSystem,
                configNames: BUILD_STORE_KEYS.filter(
                    (key) => key !== 'build_system::internal'
                ),
            })

            publishStore.current = BuildBridgeStorage.create({
                bridgeRoot,
                storePrefix: Bridge.STORE_PREFIX.publishSystem,
                configNames: PUBLISH_STORE_KEYS,
            })

            await buildStore.current?.load()
            await publishStore.current?.load()

            setStoreLoaded(true)
        }

        initializeStore()
    }, [loaded])

    return (
        <StoreContext.Provider
            value={{
                build: buildStore.current!,
                publish: publishStore.current!,
                storeLoaded: storeLoaded,
            }}
        >
            {props.children}
        </StoreContext.Provider>
    )
}
