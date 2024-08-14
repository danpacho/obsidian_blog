import { useEffect } from 'react'
import { useObsidianSetting } from './hooks'
import { Routing } from './routing'
import { BuildView } from './view/build/build.view'
import { SetupView } from './view/setup/setup.view'
import { io } from '~/utils'

const Container = (props: React.PropsWithChildren) => {
    return <div className="h-auto w-full">{props.children}</div>
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
            <Routing.Router initialRoute="setup">
                <Routing.Route path="setup" view={<SetupView />} />
                <Routing.Route path="build" view={<BuildView />} />
            </Routing.Router>
        </Container>
    )
}
