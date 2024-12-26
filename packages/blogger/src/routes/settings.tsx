import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
    component: SettingsComponent,
})

function SettingsComponent() {
    return (
        <div className="p-2">
            <h3>Settings</h3>
        </div>
    )
}
