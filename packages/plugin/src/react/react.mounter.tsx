import { ItemView, WorkspaceLeaf } from 'obsidian'
import { StrictMode } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { App } from './app'
import { AppContext } from './provider/app.root'
import { Routing } from './routing'
import ObsidianBlogger from '~/plugin/main'

export const VIEW_TYPE = '$ROOT_VIEW$' as const

export class ReactView extends ItemView {
    private root: Root | null = null
    private readonly _plugin: ObsidianBlogger
    public constructor(viewProps: {
        leaf: WorkspaceLeaf
        plugin: ObsidianBlogger
    }) {
        super(viewProps.leaf)
        this._plugin = viewProps.plugin
    }

    public getViewType() {
        return VIEW_TYPE
    }

    public getDisplayText() {
        return 'obsidian-blogger' as const
    }

    override onload(): void {}

    private render(): void {
        this.root = createRoot(this.containerEl.children[1]!)
        this.root.render(
            <StrictMode>
                <Routing.Provider>
                    <AppContext.Provider value={this._plugin}>
                        <App />
                    </AppContext.Provider>
                </Routing.Provider>
            </StrictMode>
        )
    }

    override async onOpen() {
        const isTargetRootExist = this.containerEl.children[1]
        if (!isTargetRootExist) {
            this.containerEl.createDiv({ cls: 'react-root' })
        }

        this.render()
    }

    override async onClose() {
        this.root?.unmount()
    }
}
