import { BuildBridgeStorage } from '@obsidian_blogger/plugin_api/bridge'
import { Bridge } from '@obsidian_blogger/plugin_api/constants'
import React, { useEffect, useState } from 'react'
import { useObsidianSetting } from '../hooks/use.setting'
import { BuildPlugin, InitPlugin } from '~/utils/exec'

export type BuildStorageKeys = (typeof BUILD_STORAGE_KEYS)[number]
export const BUILD_STORAGE_KEYS = Object.values(
    Bridge.MANAGER_NAME.buildSystem
).filter((key) => key !== 'build_system__internal')

export type PublishStorageKeys = (typeof PUBLISH_STORAGE_KEYS)[number]
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

const StorageSetterContext = React.createContext<{
    setStorage: React.Dispatch<
        React.SetStateAction<{
            build: BuildBridgeStorage<StorageKeys['Build']> | null
            publish: BuildBridgeStorage<StorageKeys['Publish']> | null
        }>
    > | null
    setLoadStatus: React.Dispatch<React.SetStateAction<boolean>> | null
}>({ setLoadStatus: null, setStorage: null })

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
export const useStorageSetter = () => {
    const context = React.useContext(StorageSetterContext)
    if (!context) {
        throw new Error(
            'useStorageSetter must be used within a <StorageSetterContext>'
        )
    }
    return context
}

export const useSyncStorage = () => {
    const storage = useStorage()
    const { setLoadStatus } = useStorageSetter()
    const { settings } = useObsidianSetting()

    return {
        sync: async () => {
            if (!settings || !setLoadStatus) {
                return
            }

            setLoadStatus(false)

            await BuildPlugin(settings)
            await InitPlugin(settings)

            await storage.build?.load()
            await storage.publish?.load()

            setLoadStatus(true)
        },
    }
}

export const StorageProvider = (props: React.PropsWithChildren) => {
    const [storage, setStorage] = useState<{
        build: BuildBridgeStorage<StorageKeys['Build']> | null
        publish: BuildBridgeStorage<StorageKeys['Publish']> | null
    }>({
        build: null,
        publish: null,
    })
    const { loaded, settings } = useObsidianSetting()

    const [storageLoadStatus, setLoadStatus] = useState<boolean>(false)

    useEffect(() => {
        if (!settings) return
        if (!loaded) return

        const initializeStorage = async () => {
            const bridgeRoot = settings.bridge_install_root
            setStorage({
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
            })

            await BuildPlugin(settings)
            await InitPlugin(settings)

            await storage.build?.load()
            await storage.publish?.load()

            setLoadStatus(true)
        }

        initializeStorage()
    }, [loaded])

    return (
        <StorageSetterContext.Provider
            value={{
                setLoadStatus: setLoadStatus,
                setStorage: setStorage,
            }}
        >
            <StorageContext.Provider
                value={{
                    build: storage.build,
                    publish: storage.publish,
                    loaded: storageLoadStatus,
                }}
            >
                {props.children}
            </StorageContext.Provider>
        </StorageSetterContext.Provider>
    )
}
