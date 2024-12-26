import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview')({
    component: PreviewComponent,
})

function PreviewComponent() {
    return (
        <div>
            <iframe
                // Iframe accessible name
                title="Preview"
                src="http://localhost:4321"
                className="size-full min-h-screen"
            />
        </div>
    )
}
