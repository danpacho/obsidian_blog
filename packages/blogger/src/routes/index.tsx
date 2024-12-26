import { IO } from '@obsidian_blogger/helpers'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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

const io = new IO()

function HomeComponent() {
    const [res, setRes] = useState([])

    useEffect(() => {
        const testOpen = async () => {
            const res = await io.reader.readFile('test.txt')
            const res2 = await io.finder.findFile('test.txt')
            console.log(res, res2)
        }
        testOpen()
    }, [])

    return (
        <div className="p-2">
            <h3>Welcome Home!</h3>

            <div className={box.class}>a</div>
        </div>
    )
}
