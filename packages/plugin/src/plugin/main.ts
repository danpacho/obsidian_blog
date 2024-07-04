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

// class ObsidianBloggerModal extends Modal {
//     private result: string | undefined
//     private onSubmit: (result: string) => void
//     private shell: ShellExecutor

//     constructor(app: App) {
//         super(app)
//         this.onSubmit = (result: string) => {
//             this.setTitle(result)
//             const modal = new Modal(app)
//             modal.setTitle('Result')
//             modal.setContent(result)
//             modal.open()
//         }
//         this.shell = new ShellExecutor(100)
//     }

//     override onOpen() {
//         const { contentEl } = this

//         contentEl.createEl('h2', { text: "What's your name??" })

//         new Setting(contentEl).setName('Name').addText((text) =>
//             text.onChange((value) => {
//                 this.result = value
//             })
//         )

//         new Setting(contentEl).addButton((btn) =>
//             btn
//                 .setButtonText('Submit')
//                 .setCta()
//                 .onClick(() => {
//                     if (!this.result) return
//                     this.close()
//                     this.onSubmit(this.result)
//                 })
//         )

//         new Setting(contentEl).addButton((btn) =>
//             btn
//                 .setButtonText('Install')
//                 .setCta()
//                 .onClick(async () => {
//                     try {
//                         try {
//                             const nodePath =
//                                 '/Users/june/.nvm/versions/node/v20.11.0/bin/node'
//                             const npxPath =
//                                 '/Users/june/.nvm/versions/node/v20.11.0/bin/npx'

//                             const a = await this.shell.spawn$(
//                                 nodePath,
//                                 [
//                                     npxPath,
//                                     'create-next-app@latest',
//                                     '/Users/june/Documents/project/obsidian_blogger/cli',
//                                     `--use-npm`,
//                                     '--ts',
//                                     '--tailwind',
//                                     '--app',
//                                     '--src-dir',
//                                     '--import-alias="@/*"',
//                                     '--eslint',
//                                 ],
//                                 {
//                                     env: {
//                                         //!WARN: /Users/june/.nvm/versions/node/v20.11.0/bin should be origin path
//                                         PATH: `${process.env.PATH}:/Users/june/.nvm/versions/node/v20.11.0/bin`,
//                                     },
//                                 }
//                             )

//                             const b = await this.shell.exec$(
//                                 'rm -rf /Users/june/Documents/project/obsidian_blogger/cli',
//                                 true
//                             )

//                             const c = await this.shell.exec$('ls -al', true)

//                             const res = `${a.result}\n${b.stdout}\n${c.stdout}`
//                             console.log(res)
//                             this.onSubmit(res)
//                             this.result = res ?? 'No result'
//                         } catch (err) {
//                             this.onSubmit(
//                                 `Can't execute command ${JSON.stringify(err, null, 4)}`
//                             )
//                             this.result = `Can't execute command ${JSON.stringify(err, null, 4)}`
//                         }
//                     } catch (e) {
//                         new Notice("Can't execute command")
//                     }
//                 })
//         )
//     }

//     override onClose() {
//         const { contentEl } = this
//         contentEl.empty()
//     }
// }

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
