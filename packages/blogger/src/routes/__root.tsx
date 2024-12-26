import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <>
            <div className="flex justify-between gap-2 p-2 text-base">
                <Link
                    to="/"
                    activeProps={{
                        className: 'font-bold underline',
                    }}
                    activeOptions={{ exact: true }}
                >
                    Home
                </Link>{' '}
                <Link
                    to="/preview"
                    activeProps={{
                        className: 'font-bold underline',
                    }}
                >
                    Preview
                </Link>
                <Link
                    to="/settings"
                    activeProps={{
                        className: 'font-bold underline',
                    }}
                >
                    Settings
                </Link>
            </div>
            <hr />
            <Outlet />
            <TanStackRouterDevtools position="bottom-right" />
        </>
    )
}
