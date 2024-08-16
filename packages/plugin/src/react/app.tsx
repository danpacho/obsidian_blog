import { useEffect, useRef } from 'react'
import { useObsidianSetting } from './hooks'
import { StoreProvider } from './provider/bridge.store'
import { Routing } from './routing'
import { BuildView } from './view/build/build.view'
import { SetupView } from './view/setup/setup.view'
import { io } from '~/utils'

const Container = (props: React.PropsWithChildren) => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.parentElement?.classList.add('bg-[#262626]')
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
            const setupCompleted = await io.fileExists(
                settings.bridge_install_root
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
            <StoreProvider>
                <Routing.Router initialRoute="setup">
                    <Routing.Route path="setup" view={<SetupView />} />
                    <Routing.Route path="build" view={<BuildView />} />
                </Routing.Router>
            </StoreProvider>
        </Container>
    )
}
