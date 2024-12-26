import { type TailwindCustom } from '../tools/tw.js'

export interface TailwindComponent {
    /**
     * @property `tailwindcss`: Custom style to be applied to the component
     */
    tw?: TailwindCustom
}
