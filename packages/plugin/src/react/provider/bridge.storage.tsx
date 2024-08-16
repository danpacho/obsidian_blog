import { Bridge } from '@obsidian_blogger/constants'
import React, { useEffect, useRef, useState } from 'react'
import { BuildBridgeStorage } from '../../core/bridge.storage'
import { useObsidianSetting } from '../hooks/use.setting'

export const BUILD_STORAGE_KEYS = Object.values(
    Bridge.MANAGER_NAME.buildSystem
).filter((key) => key !== 'build_system::internal')

export const PUBLISH_STORAGE_KEYS = Object.values(
    Bridge.MANAGER_NAME.publishSystem
)

export interface StorageKeys {
    Build: typeof BUILD_STORAGE_KEYS
    Publish: typeof PUBLISH_STORAGE_KEYS
}

const StorageContext = React.createContext<{
    /**
     * Build plugin bridge storage
     */
    build: BuildBridgeStorage<StorageKeys['Build']> | null
    /**
     * Publish plugin bridge storage
     */
    publish: BuildBridgeStorage<StorageKeys['Publish']> | null
    /**
     * Storage loaded status, if `true` storage data is loaded
     */
    loaded: boolean
}>({
    build: null,
    publish: null,
    loaded: false,
})

/**
 * Use build, publish bridge storage
 */
export const useStorage = () => {
    const context = React.useContext(StorageContext)
    if (!context) {
        throw new Error('useStore must be used within a <StoreProvider>')
    }
    return context
}

export const StorageProvider = (props: React.PropsWithChildren) => {
    const storage = useRef<{
        build: BuildBridgeStorage<StorageKeys['Build']> | null
        publish: BuildBridgeStorage<StorageKeys['Publish']> | null
    }>({
        build: null,
        publish: null,
    })
    const { loaded, settings } = useObsidianSetting()

    const [storageLoaded, setStoreLoaded] = useState<boolean>(false)

    useEffect(() => {
        if (!settings) return
        if (!loaded) return

        const initializeStorage = async () => {
            const bridgeRoot = settings.bridge_install_root
            storage.current = {
                build: BuildBridgeStorage.create({
                    bridgeRoot,
                    storePrefix: Bridge.STORE_PREFIX.buildSystem,
                    configNames: BUILD_STORAGE_KEYS,
                }),
                publish: BuildBridgeStorage.create({
                    bridgeRoot,
                    storePrefix: Bridge.STORE_PREFIX.publishSystem,
                    configNames: PUBLISH_STORAGE_KEYS,
                }),
            }

            await storage.current.build?.load()
            await storage.current.publish?.load()

            setStoreLoaded(true)
        }

        initializeStorage()
    }, [loaded])

    return (
        <StorageContext.Provider
            value={{
                build: storage.current.build,
                publish: storage.current.publish,
                loaded: storageLoaded,
            }}
        >
            {props.children}
        </StorageContext.Provider>
    )
}
