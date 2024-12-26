import { Button, Label } from '@obsidian_blogger/design_system/components'
import React, { useEffect, useRef, useState } from 'react'

const RouteValueContext = React.createContext<string | undefined>(undefined)
const RouteSetterContext = React.createContext<
    React.Dispatch<React.SetStateAction<string>> | undefined
>(undefined)

export const useRoute = (): {
    route: string | undefined
    setRoute: React.Dispatch<React.SetStateAction<string>> | undefined
} => {
    const route = React.useContext(RouteValueContext)
    const setRoute = React.useContext(RouteSetterContext)
    return { route, setRoute }
}

export const RouterProvider = ({ children }: { children: React.ReactNode }) => {
    const [route, setRoute] = useState<string>('')
    return (
        <RouteValueContext.Provider value={route}>
            <RouteSetterContext.Provider value={setRoute}>
                {children}
            </RouteSetterContext.Provider>
        </RouteValueContext.Provider>
    )
}

interface RouterProps {
    children: React.ReactNode
    initialRoute: string
}
const Router = ({ children, initialRoute }: RouterProps) => {
    const { route, setRoute } = useRoute()
    const routes = useRef<Map<string, React.ReactNode>>(new Map())

    useEffect(() => {
        setRoute?.(initialRoute!)
        React.Children.forEach(children, (child: React.ReactNode) => {
            if (!React.isValidElement(child)) return
            if (
                !React.isValidElement<{ path: string }>(child) ||
                !child.props.path
            )
                return

            routes.current.set(child.props.path, child)
        })
    }, [])

    if (!route) {
        return (
            <div className="flex size-full items-center justify-center">
                <Label color="green" tw={{ animation: 'animate-pulse' }}>
                    Loading...
                </Label>
            </div>
        )
    }

    const routedView = routes.current.get(route)

    if (!routedView) {
        const label = `Route "${route}" not found`
        return (
            <div className="relative flex h-screen w-full items-center justify-center">
                <Label color="red">{label}</Label>
                <Link to={initialRoute}>
                    <Button>Go back</Button>
                </Link>
            </div>
        )
    }

    return <>{routes.current.get(route)}</>
}
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string
    disabled?: boolean
}
const Link = ({
    to,
    children,
    disabled,
    ...linkAttr
}: React.PropsWithChildren<LinkProps>) => {
    const { setRoute } = useRoute()
    return (
        <a
            onClick={(e) => {
                if (disabled) return
                e.preventDefault()
                setRoute?.(to)
            }}
            {...linkAttr}
            className={`${linkAttr.className} cursor-pointer decoration-stone-100 underline-offset-2`}
        >
            {children}
        </a>
    )
}
interface RouteProps {
    path: string
    view: React.ReactNode
}
const Route = ({ path, view }: RouteProps) => {
    return <main id={path}>{view}</main>
}

const Routing = {
    Provider: RouterProvider,
    Router,
    Route,
    Link,
    useRoute,
}

export { Routing }
