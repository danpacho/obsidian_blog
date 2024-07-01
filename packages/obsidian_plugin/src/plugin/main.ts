import { ShellExecutor } from '@obsidian_blogger/helpers/shell'
import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginManifest,
    PluginSettingTab,
    Setting,
} from 'obsidian'

interface BloggerSettings {
    name: string
}

const DEFAULT_SETTINGS = {
    name: 'default',
} as const satisfies BloggerSettings

export default class ObsidianBlogger extends Plugin {
    public settings: BloggerSettings

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest)
        this.settings = {
            name: '',
        }
    }

    override async onload() {
        await this.loadSettings()

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon(
            'heart',
            'Obsidian blogger',
            (evt: MouseEvent) => {
                console.log('Ribbon icon clicked', evt)
                // Called when the user clicks the icon.
                new ObsidianBloggerModal(this.app).open()
            }
        )
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class')

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBar = this.addStatusBarItem()
        statusBar.createEl('span', { text: '💡 updated' })

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Obsidian-blogger build',
            callback: () => {
                new ObsidianBloggerModal(this.app).open()
            },
        })
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Obsidian blogger (editor)',
            editorCallback: (editor: Editor) => {
                console.log(editor.getSelection())
                editor.replaceSelection('Sample Editor Command')
            },
        })
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Obsidian blogger (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView =
                    this.app.workspace.getActiveViewOfType(MarkdownView)
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new ObsidianBloggerModal(this.app).open()
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true
                }
            },
        })

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new ObsidianBloggerSetting(this.app, this))

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //     console.log('click', evt)
        // })

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        // this.registerInterval(
        //     window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000)
        // )
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

class ObsidianBloggerModal extends Modal {
    private result: string | undefined
    private onSubmit: (result: string) => void
    private shell: ShellExecutor

    constructor(app: App) {
        super(app)
        this.onSubmit = (result: string) => {
            this.setTitle(result)
            const modal = new Modal(app)
            modal.setTitle('Result')
            modal.setContent(result)
            modal.open()
        }
        this.shell = new ShellExecutor(100)
    }

    override onOpen() {
        const { contentEl } = this

        contentEl.createEl('h2', { text: "What's your name??" })

        new Setting(contentEl).setName('Name').addText((text) =>
            text.onChange((value) => {
                this.result = value
            })
        )

        new Setting(contentEl).addButton((btn) =>
            btn
                .setButtonText('Submit')
                .setCta()
                .onClick(() => {
                    if (!this.result) return
                    this.close()
                    this.onSubmit(this.result)
                })
        )

        new Setting(contentEl).addButton((btn) =>
            btn
                .setButtonText('Install')
                .setCta()
                .onClick(async () => {
                    try {
                        try {
                            const nodePath =
                                '/Users/june/.nvm/versions/node/v20.11.0/bin/node'
                            const npxPath =
                                '/Users/june/.nvm/versions/node/v20.11.0/bin/npx'

                            const a = await this.shell.spawn$(
                                nodePath,
                                [
                                    npxPath,
                                    'create-next-app@latest',
                                    '/Users/june/Documents/project/obsidian-blogger/cli',
                                    `--use-npm`,
                                    '--ts',
                                    '--tailwind',
                                    '--app',
                                    '--src-dir',
                                    '--import-alias="@/*"',
                                    '--eslint',
                                ],
                                {
                                    env: {
                                        //!WARN: /Users/june/.nvm/versions/node/v20.11.0/bin should be origin path
                                        PATH: `${process.env.PATH}:/Users/june/.nvm/versions/node/v20.11.0/bin`,
                                    },
                                }
                            )

                            const b = await this.shell.exec$(
                                'rm -rf /Users/june/Documents/project/obsidian-blogger/cli',
                                true
                            )

                            const c = await this.shell.exec$('ls -al', true)

                            const res = `${a.result}\n${b.stdout}\n${c.stdout}`
                            console.log(res)
                            this.onSubmit(res)
                            this.result = res ?? 'No result'
                        } catch (err) {
                            this.onSubmit(
                                `Can't execute command ${JSON.stringify(err, null, 4)}`
                            )
                            this.result = `Can't execute command ${JSON.stringify(err, null, 4)}`
                        }
                    } catch (e) {
                        new Notice(e.error)
                    }
                })
        )
    }

    override onClose() {
        const { contentEl } = this
        contentEl.empty()
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

// export class ExampleView extends ItemView {
//     constructor(leaf: WorkspaceLeaf) {
//         super(leaf)
//     }

//     getViewType() {
//         return VIEW_TYPE_EXAMPLE
//     }

//     getDisplayText() {
//         return 'Example view'
//     }

//     override async onOpen() {
//         const container = this.containerEl.children[1]
//         container?.empty()
//         container?.createEl('h4', { text: 'Example view' })
//     }

//     override async onClose() {
//         // Nothing to clean up.
//     }
// }
