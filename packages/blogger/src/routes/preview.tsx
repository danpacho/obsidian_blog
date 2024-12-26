import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview')({
    component: PreviewComponent,
})

function PreviewComponent() {
    return (
        // Open localhost:4322 in your browser to see this component
        <div>
            <iframe
                src="http://localhost:4321"
                className="size-full min-h-screen"
            />
        </div>
    )
}
