import { createFileRoute } from '@tanstack/react-router'
import { tw } from '../tw'

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
            <h3>Welcome Home!</h3>
            <div className={box.class}>a</div>
        </div>
    )
}
