import { ItemView, WorkspaceLeaf } from 'obsidian'
import { StrictMode } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { AppContext } from './provider/app.root'
import { BuildView } from './view/build.view'

export const VIEW_TYPE = '$ROOT_VIEW$' as const

export class ReactView extends ItemView {
    private root: Root | null = null

    public constructor(leaf: WorkspaceLeaf) {
        super(leaf)
    }

    public getViewType() {
        return VIEW_TYPE
    }

    public getDisplayText() {
        return 'obsidian-blogger'
    }

    override async onOpen() {
        const isTargetRootExist = this.containerEl.children[1]
        if (!isTargetRootExist) {
            this.containerEl.createDiv({ cls: 'react-root' })
        }
        this.root = createRoot(this.containerEl.children[1]!)
        this.root.render(
            <StrictMode>
                <AppContext.Provider value={this.app}>
                    <BuildView />
                </AppContext.Provider>
            </StrictMode>
        )
    }

    override async onClose() {
        this.root?.unmount()
    }
}
