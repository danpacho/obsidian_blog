import { App, Plugin, PluginManifest, WorkspaceLeaf } from 'obsidian'
import {
    ObsidianBloggerSetting,
    type ObsidianBloggerSettings,
} from './settings'
import { ReactView, VIEW_TYPE } from '~/react/react.mounter'
export default class ObsidianBlogger extends Plugin {
    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest)
        const defaultObsidianVaultRoot = app.vault.getRoot().path
        this._settings.obsidian_vault_root = defaultObsidianVaultRoot
    }

    public get settings(): ObsidianBloggerSettings {
        return this._settings
    }
    public set settings(value: ObsidianBloggerSettings) {
        this._settings = value
    }
    private _settings: ObsidianBloggerSettings = {
        obsidian_vault_root: '',
        bridge_install_root: '',
        blog_assets_root: '',
        blog_contents_root: '',
        node_bin: '',
    }
    private _isViewActive: boolean = false

    private async activateReactView() {
        const { workspace } = this.app

        let leaf: WorkspaceLeaf | null = null
        const leaves = workspace.getLeavesOfType(VIEW_TYPE)

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0]!
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            leaf = workspace.getRightLeaf(false)
            await leaf!.setViewState({ type: VIEW_TYPE, active: true })
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf!)

        this._isViewActive = true
    }

    private async deactivateReactView() {
        const { workspace } = this.app

        const leaves = workspace.getLeavesOfType(VIEW_TYPE)
        if (leaves.length === 0) return

        const leaf = leaves[0]!
        await leaf.setViewState({ type: VIEW_TYPE, active: false })
        workspace.detachLeavesOfType(VIEW_TYPE)
        workspace.rightSplit.collapse()
        this._isViewActive = false
    }

    private registerCommands() {
        this.addCommand({
            id: 'open-obsidian-blogger',
            name: 'Open obsidian blogger',
            callback: async () => {
                await this.activateReactView()
            },
        })
    }

    private registerOpenButton(): void {
        this.addRibbonIcon('cpu', 'Obsidian blogger', async () => {
            if (!this._isViewActive) {
                await this.activateReactView()
            } else {
                await this.deactivateReactView()
            }
        })
    }

    private registerStatusBar(): void {
        const statusBar = this.addStatusBarItem()
        statusBar.createEl('span', {
            text: 'Blogger',
            cls: 'text-green-400 text-[10px] py-[2.5px] px-[2.5px] rounded-sm bg-green-400/15 hover:bg-green-400/25 cursor-pointer',
        })
        statusBar.onClickEvent(() => {
            if (!this._isViewActive) {
                this.activateReactView()
            } else {
                this.deactivateReactView()
            }
        })
    }

    private registerSettings() {
        this.addSettingTab(new ObsidianBloggerSetting(this.app, this))
    }

    override async onload() {
        await this.loadSettings()

        this.registerView(
            VIEW_TYPE,
            (leaf) => new ReactView({ leaf, plugin: this })
        )
        this.registerCommands()
        this.registerOpenButton()
        this.registerStatusBar()
        this.registerSettings()
    }

    public override onunload() {
        // this.deactivateReactView()
    }

    async loadSettings() {
        const loaded = await this.loadData()
        this._settings = Object.assign(
            {},
            {
                obsidian_vault_root: this.app.vault.getRoot().path,
                blog_assets_root: '',
                blog_contents_root: '',
                bridge_install_root: `${this.app.vault.getRoot().path}/.bridge`,
            },
            loaded
        )
    }

    async saveSettings() {
        await this.saveData(this._settings)
    }
}
