import {
    CreateTailwindLiteral,
    type CreateTailwindest,
    createTools,
} from 'tailwindest'
import type { TailwindNestGroups, Tailwind } from './tailwind.js'

export type Tailwindest = CreateTailwindest<{
    tailwind: Tailwind
    tailwindNestGroups: TailwindNestGroups
    useArbitrary: true
    groupPrefix: '$'
}>
export type TailwindLiteral = CreateTailwindLiteral<Tailwind>

export const tw = createTools<{
    tailwindest: Tailwindest
    tailwindLiteral: TailwindLiteral
    useArbitrary: true
}>()

export * from 'tailwindest'
