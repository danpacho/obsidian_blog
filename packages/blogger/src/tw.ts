import { type GetVariants, type Tailwindest, createTools } from 'tailwindest'

/**
 * Custom type definition of tailwindest
 * @see {@link https://tailwindest.vercel.app/apis/Tailwindest api reference}
 */
type TailwindCustom = Tailwindest<
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    // eslint-disable-next-line @typescript-eslint/ban-types
    {},
    {
        breakIdentifier: '$'
        pseudoClassIdentifier: '$'
        pseudoElementIdentifier: '$'
    }
>
/**
 * Full type definition of `tailwindcss`
 */
type Tailwind = Required<TailwindCustom>

const tw = createTools<TailwindCustom>()

export { tw, type Tailwind, type TailwindCustom, type GetVariants }
