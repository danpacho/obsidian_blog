import { Logger } from '@obsidian_blogger/helpers'
export const m = new Logger({
    name: 'builder',
    useDate: true,
})

export const prettyPrint = (obj: unknown) => JSON.stringify(obj, null, 2)
