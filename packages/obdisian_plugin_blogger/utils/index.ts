import { IOManager } from '@blogger/build_system'
import { Logger } from '@blogger/logger'

export const io = new IOManager()
export const lg = new Logger({ name: 'plugin_builder' })
