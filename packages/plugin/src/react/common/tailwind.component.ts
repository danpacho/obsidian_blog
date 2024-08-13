import { type TailwindCustom } from '../tw'

export interface TailwindComponent {
    /**
     * @property `tailwindcss`: Custom style to be applied to the component
     */
    style?: TailwindCustom
}
