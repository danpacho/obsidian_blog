import { useEffect, useState } from 'react'
import { useApp } from '../provider/app.root'
import { ObsidianBloggerSettings } from '~/plugin/settings'

export const useObsidianSetting = (): ObsidianBloggerSettings | undefined => {
    const app = useApp()

    const [settings, setSettings] = useState<
        ObsidianBloggerSettings | undefined
    >(undefined)

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await app?.loadData()
            setSettings(settings)
        }
        loadSettings()
    }, [app])

    return settings
}
