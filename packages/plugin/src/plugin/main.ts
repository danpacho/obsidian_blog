import {
    App,
    // Modal,
    // Notice,
    Plugin,
    PluginManifest,
    PluginSettingTab,
    Setting,
    WorkspaceLeaf,
} from 'obsidian'
import { ReactView, VIEW_TYPE } from '~/react/react.mounter'

interface BloggerSettings {
    name: string
}

const DEFAULT_SETTINGS = {
    name: 'default',
} as const satisfies BloggerSettings

export default class ObsidianBlogger extends Plugin {
    public settings: BloggerSettings
    private isViewOpen: boolean = false

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest)
        this.settings = {
            name: '',
        }
    }

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

        this.isViewOpen = true
    }

    private async deactivateReactView() {
        const { workspace } = this.app

        const leaves = workspace.getLeavesOfType(VIEW_TYPE)
        if (leaves.length === 0) return

        const leaf = leaves[0]!
        await leaf.setViewState({ type: VIEW_TYPE, active: false })
        workspace.detachLeavesOfType(VIEW_TYPE)
        workspace.rightSplit.collapse()
        this.isViewOpen = false
    }

    private registerCommands() {
        this.addCommand({
            id: 'open-obsidian-blogger',
            name: 'Open Obsidian Blogger',
            callback: () => {
                this.activateReactView()
            },
        })
    }

    override async onload() {
        await this.loadSettings()
        this.registerView(VIEW_TYPE, (leaf) => new ReactView(leaf))
        this.registerCommands()
        const ribbonIconEl = this.addRibbonIcon(
            'wrench',
            'Obsidian blogger',
            async (evt: MouseEvent) => {
                console.log('Ribbon icon clicked', evt)
                console.log('isViewOpen', this.isViewOpen)
                if (!this.isViewOpen) await this.activateReactView()
                else await this.deactivateReactView()
            }
        )
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class')

        const statusBar = this.addStatusBarItem()
        statusBar.createEl('span', { text: '💡 updated' })

        this.addSettingTab(new ObsidianBloggerSetting(this.app, this))
    }

    override onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        )
    }

    async saveSettings() {
        await this.saveData(this.settings)
    }
}

class ObsidianBloggerSetting extends PluginSettingTab {
    constructor(
        app: App,
        public readonly plugin: ObsidianBlogger
    ) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this

        containerEl.empty()

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc("It's a secret")
            .addText((text) =>
                text
                    .setPlaceholder('Enter your secret')
                    .setValue(this.plugin.settings.name)
                    .onChange(async (value) => {
                        this.plugin.settings.name = value
                        await this.plugin.saveSettings()
                    })
            )
    }
}
