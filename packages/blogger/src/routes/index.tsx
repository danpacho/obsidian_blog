import { tw } from '@obsidian_blogger/design_system'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: HomeComponent,
})

const box = tw.style({
    backgroundColor: 'bg-red-100',
    padding: 'p-2',
    borderRadius: 'rounded',
    borderWidth: 'border',
    borderColor: 'border-red-500',
})

function HomeComponent() {
    return (
        <div className="p-2">
            <div className={box.class}>Welcome Home</div>
        </div>
    )
}
