import { createContext, useContext } from 'react'

import type ObsidianBlogger from '~/plugin/main'

export const AppContext = createContext<ObsidianBlogger | undefined>(undefined)

export const useApp = (): ObsidianBlogger | undefined => {
    return useContext(AppContext)
}
