import { useEffect, useRef } from 'react'

import { useObsidianSetting } from './hooks'
import { StorageProvider } from './provider/bridge.storage'
import { Routing } from './routing'
import { BuildView } from './view/build/build.view'
import { SetupView } from './view/setup/setup.view'

import { Io } from '~/utils'

const Container = (props: React.PropsWithChildren) => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.parentElement?.classList.add('bg-[#101010FF]')
        }
    }, [])
    return (
        <div ref={containerRef} className="h-auto w-full">
            {props.children}
        </div>
    )
}

const useSetupInitialRoute = (): void => {
    const { loaded, settings } = useObsidianSetting()
    const { setRoute } = Routing.useRoute()
    useEffect(() => {
        const setupRoute = async () => {
            if (!settings || !setRoute) return
            const setupCompleted = await Io.fileExists(
                `${settings.bridge_install_root}/node_modules`
            )
            if (setupCompleted) {
                setRoute('build')
            }
        }
        setupRoute()
    }, [loaded])
}

export function App() {
    useSetupInitialRoute()

    return (
        <Container>
            <StorageProvider>
                <Routing.Router initialRoute="setup">
                    <Routing.Route path="setup" view={<SetupView />} />
                    <Routing.Route path="build" view={<BuildView />} />
                </Routing.Router>
            </StorageProvider>
        </Container>
    )
}
