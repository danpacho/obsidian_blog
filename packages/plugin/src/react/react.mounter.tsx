import { ItemView, WorkspaceLeaf } from 'obsidian'
import { StrictMode } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { AppContext } from './provider/app.root'
import { BuildView } from './view/build/build.view'
import { SetupView } from './view/setup/setup.view'
import ObsidianBlogger from '~/plugin/main'
import { io } from '~/utils/io'

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

    private _state: 'setup_view' | 'build_view' = 'setup_view'

    public getViewType() {
        return VIEW_TYPE
    }

    public getDisplayText() {
        return 'obsidian-blogger' as const
    }

    override onload(): void {
        this._state = io.fileExistsSync(
            this._plugin.settings.bridge_install_root
        )
            ? 'build_view'
            : 'setup_view'
        this._state = 'setup_view'
    }

    private render(): void {
        this.root = createRoot(this.containerEl.children[1]!)
        this.root.render(
            <StrictMode>
                <AppContext.Provider value={this._plugin}>
                    {this._state === 'setup_view' ? <SetupView /> : null}
                    {this._state === 'build_view' ? <BuildView /> : null}
                </AppContext.Provider>
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
