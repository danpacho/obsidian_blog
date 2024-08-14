import { useEffect, useState } from 'react'
import { useApp } from '../provider/app.root'
import { ObsidianBloggerSettings } from '~/plugin/settings'

export const useObsidianSetting = (
    defaultSetting?: ObsidianBloggerSettings
): {
    settings: ObsidianBloggerSettings | undefined
    loaded: boolean
} => {
    const app = useApp()

    const [loaded, setLoaded] = useState<boolean>(false)
    const [settings, setSettings] = useState<
        ObsidianBloggerSettings | undefined
    >(defaultSetting)

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await app?.loadData()
            const mergedSettings = defaultSetting
                ? { ...defaultSetting, ...settings }
                : settings
            setSettings(mergedSettings)
            setLoaded(true)
        }
        loadSettings()
    }, [app])

    return { settings, loaded }
}
