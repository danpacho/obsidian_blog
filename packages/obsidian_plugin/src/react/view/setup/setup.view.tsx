import {
    Button,
    Input,
    Label,
    Loader,
    Text,
    Tooltip,
    useInput,
    useTimer,
    useTooltip,
} from '@obsidian_blogger/design_system'
import { useEffect, useMemo, useState } from 'react'

import type { ObsidianBloggerSettings } from '~/plugin/settings'

import { useObsidianSetting } from '~/react/hooks'
import { useApp } from '~/react/provider/app.root'
import { Routing } from '~/react/routing'
import { Io, Shell } from '~/utils'

interface InstallConfig {
    bridge_install_root: string
    install_pkg?: string
    obsidian_vault_root: string
    blog_assets_root: string
    blog_contents_root: string
}
/**
 * @example
 * ```bash
 * # Run create command
 * npx create-obsidian-blogger
 *    "${bridge_root}"
 *    "${obsidian_vault_root}"
 *    "${blog_root}/static/assets"e
 *    "${blog_root}/static/md"
 * ```
 */
const createBloggerBridge = async (nodeBin: string, config: InstallConfig) => {
    const configValues = Object.values(config)

    const installResponse = await Shell.spawn$(
        'npx',
        ['create-obsidian-blogger', 'create', ...configValues],
        {
            env: {
                PATH: `${process.env.PATH}:${nodeBin}`,
            },
        }
    )
    return installResponse
}

const isValidConfig = (input: string): boolean => {
    if (input.trim() === '') {
        return false
    }

    const pathRegex = /^([a-zA-Z]:)?(\\|\/)?([^<>:"/\\|?*\r\n]+(\\|\/)?)*$/

    if (!pathRegex.test(input)) {
        return false
    }

    return true
}

const ConfigInput = ({
    description,
    id,
    required,
    title,
    input,
    setInput,
}: {
    input: string
    setInput: (input: string) => void
    id: keyof ObsidianBloggerSettings
    title: string
    description: string
    required: boolean
}) => {
    const app = useApp()
    const [isValid, setIsValid] = useState(false)
    const [errorMessages, setErrorMessages] = useState<string[]>([])
    const error = errorMessages.join(' ')
    const isError = errorMessages.length > 0

    const message = isError ? 'Error' : isValid ? 'Saved' : 'Save'

    return (
        <div key={id} className="w-full pt-2 pb-4">
            <div className="flex w-full flex-col items-start justify-start gap-2">
                <div className="flex w-full flex-row gap-x-2">
                    <Text.Paragraph tw={{ fontFamily: 'font-mono' }}>
                        {title}
                    </Text.Paragraph>
                    <Label color={required ? 'yellow' : 'green'}>
                        {required ? 'required' : 'optional'}
                    </Label>
                </div>
                <div className="flex w-full flex-row gap-x-2">
                    <Input
                        input={input}
                        type="text"
                        setInput={(input) => setInput(input)}
                        title={title}
                        placeholder={isError ? error : description}
                        description={
                            <>
                                <Label color={required ? 'yellow' : 'green'}>
                                    {required ? 'required' : 'optional'}
                                </Label>
                            </>
                        }
                    />
                    <Button
                        tw={{ fontSize: 'text-xs' }}
                        type={
                            isError ? 'error' : isValid ? 'success' : 'normal'
                        }
                        onClick={async () => {
                            if (!app) return
                            if (!isValidConfig(input)) {
                                setIsValid(false)
                                setErrorMessages([
                                    'Invalid path format. Please check the path',
                                    input,
                                ])
                                return
                            }
                            try {
                                setIsValid(true)
                                setErrorMessages([])
                                app.settings[id] = input ?? ''
                                await app?.saveSettings()
                            } catch (e) {
                                setIsValid(false)
                                if (e instanceof Error) {
                                    setErrorMessages([e.message, input])
                                } else {
                                    setErrorMessages([JSON.stringify(e), input])
                                }
                            }
                        }}
                    >
                        {message}
                    </Button>
                </div>
            </div>

            {isError && <Label color="red">{error}</Label>}
        </div>
    )
}

const ConfigView = () => {
    const { settings, loaded } = useObsidianSetting({
        obsidian_vault_root: '',
        bridge_install_root: '',
        blog_assets_root: '',
        blog_contents_root: '',
        node_bin: '',
    })

    const settingsWithInfo = useMemo(
        () =>
            Object.entries(settings ?? {}).map((config) => {
                const key: keyof ObsidianBloggerSettings =
                    config[0] as keyof ObsidianBloggerSettings
                if (key === 'node_bin') {
                    return {
                        key,
                        required: true,
                        title: 'node_bin',
                        description: 'root path for the node',
                    }
                } else if (key === 'bridge_install_root') {
                    return {
                        key,
                        required: true,
                        title: 'bridge_root',
                        description: 'root path for the bridge package',
                    }
                } else if (key === 'obsidian_vault_root') {
                    return {
                        key,
                        required: true,
                        title: 'obsidian_vault_root',
                        description: 'root path for the obsidian vault',
                    }
                } else if (key === 'blog_assets_root') {
                    return {
                        key,
                        required: true,
                        title: 'blog_assets_root',
                        description: 'root path for the blog assets',
                    }
                } else if (key === 'blog_contents_root') {
                    return {
                        key,
                        required: true,
                        title: 'blog_contents_root',
                        description: 'root path for the blog contents',
                    }
                }
            }),
        [loaded]
    )

    const { input: blogAssetsRoot, setInput: setBlogAssetsRoot } = useInput('')
    const { input: blogContentsRoot, setInput: setBlogContentsRoot } =
        useInput('')
    const { input: bridgeInstallRoot, setInput: setBridgeInstallRoot } =
        useInput('')
    const { input: nodeBin, setInput: setNodeBin } = useInput('')
    const { input: obsidianVaultRoot, setInput: setObsidianVaultRoot } =
        useInput('')

    const inputHook = {
        blog_assets_root: {
            input: blogAssetsRoot,
            setInput: setBlogAssetsRoot,
        },
        blog_contents_root: {
            input: blogContentsRoot,
            setInput: setBlogContentsRoot,
        },
        bridge_install_root: {
            input: bridgeInstallRoot,
            setInput: setBridgeInstallRoot,
        },
        node_bin: { input: nodeBin, setInput: setNodeBin },
        obsidian_vault_root: {
            input: obsidianVaultRoot,
            setInput: setObsidianVaultRoot,
        },
    }

    useEffect(() => {
        if (!settings) return

        Object.entries(settings).forEach(([key, value]) => {
            if (key in inputHook) {
                if (!isValidConfig(value)) return
                inputHook[key as keyof ObsidianBloggerSettings].setInput(value)
            }
        })
    }, [loaded])

    return (
        <div className="flex flex-col gap-y-2 divide-y divide-stone-700">
            {Object.values(settingsWithInfo)
                .filter((config) => config !== undefined)
                .map(({ title, description, key, required }) => (
                    <ConfigInput
                        key={key}
                        id={key}
                        title={title}
                        description={description}
                        required={required}
                        input={inputHook[key].input}
                        setInput={inputHook[key].setInput}
                    />
                ))}
        </div>
    )
}

type InstallStatus = 'invalid' | 'reinstall' | 'install'
type InstallProgress =
    | 'idle'
    | 'installing'
    | 'install_success'
    | 'install_failed'

export function SetupView() {
    const { settings, loaded } = useObsidianSetting()

    const [installStatus, setInstallStatus] = useState<InstallStatus>('invalid')

    const [installProgress, setInstallProgress] =
        useState<InstallProgress>('idle')

    const { setRoute } = Routing.useRoute()

    useEffect(() => {
        tooltipController.calculatePosition()
    }, [installProgress, installStatus])

    const { startTimer: moveToBuildView } = useTimer(
        {
            start: () => {
                setRoute?.('build')
            },
            clear: () => {},
        },
        2500
    )

    const tooltipController = useTooltip({
        delay: 500,
        position: 'top',
    })

    const getInstallStatus = async (): Promise<InstallStatus> => {
        if (!settings) return 'invalid'

        const valid = Object.values(settings).every((config) =>
            isValidConfig(config)
        )
        if (!valid) return 'invalid'

        const alreadyInstalled = await Io.fileExists(
            settings.bridge_install_root
        )

        if (alreadyInstalled) return 'reinstall'

        return 'install'
    }

    useEffect(() => {
        const setInitialStatus = async () => {
            const status = await getInstallStatus()
            setInstallStatus(status)
        }
        setInitialStatus()
    }, [loaded])

    const [messages, setMessages] = useState<Array<string>>([])

    const buttonType = () => {
        switch (installProgress) {
            case 'idle': {
                return installStatus === 'invalid'
                    ? 'disabled'
                    : installStatus === 'reinstall'
                      ? 'warn'
                      : 'normal'
            }
            case 'installing':
                return 'disabled'
            case 'install_success':
                return 'success'
            case 'install_failed':
                return 'error'
            default:
                return 'normal'
        }
    }

    const tooltipContent = () => {
        switch (installProgress) {
            case 'idle': {
                return installStatus === 'invalid'
                    ? 'Please fill in the required fields correctly'
                    : installStatus === 'reinstall'
                      ? 'Warning: Reinstalling will overwrite the existing bridge'
                      : 'Install the bridge at bridge_root'
            }
            case 'installing':
                return 'Installing the bridge package'
            case 'install_success':
                return 'Installation successful'
            case 'install_failed':
                return 'Installation failed'
            default:
                return 'Install the bridge at bridge_root'
        }
    }

    const buttonText = () => {
        switch (installProgress) {
            case 'idle': {
                return installStatus === 'invalid'
                    ? 'Invalid settings'
                    : installStatus === 'reinstall'
                      ? 'Re-install'
                      : 'Install'
            }
            case 'install_success':
                return 'success'
            case 'install_failed':
                return `error, ${messages.join(', ')}`
            case 'installing': {
                return (
                    <>
                        <Loader />
                        <span className="animate-pulse text-blue-300">
                            {messages.join(', ')}
                        </span>
                    </>
                )
            }
            default:
                return 'install'
        }
    }

    return (
        <div className="flex size-full flex-col gap-y-4">
            <ConfigView />

            <div className="flex w-full flex-col gap-y-2 py-5">
                <Tooltip
                    tooltipContent={tooltipContent()}
                    {...tooltipController}
                >
                    <Button
                        tw={{ width: 'w-full' }}
                        type={buttonType()}
                        disabled={
                            installStatus === 'invalid' ||
                            installProgress === 'install_success' ||
                            installProgress === 'installing'
                        }
                        onClick={async () => {
                            setMessages([])

                            const status = await getInstallStatus()
                            if (status === 'invalid') return

                            if (!settings) return
                            const {
                                blog_assets_root,
                                blog_contents_root,
                                bridge_install_root,
                                node_bin,
                                obsidian_vault_root,
                            } = settings

                            setInstallProgress('installing')

                            try {
                                setMessages(['remove previous dir'])
                                await Io.removeDir(bridge_install_root)

                                setMessages(['create new bridge'])

                                const installResult = await createBloggerBridge(
                                    node_bin,
                                    {
                                        bridge_install_root,
                                        obsidian_vault_root,
                                        blog_assets_root,
                                        blog_contents_root,
                                    }
                                )
                                const isError =
                                    'error_code' in installResult &&
                                    installResult.stderr !== ''

                                if (isError) {
                                    setInstallProgress('install_failed')
                                    setMessages([installResult.stderr])
                                } else {
                                    setInstallProgress('install_success')
                                    moveToBuildView()
                                }
                            } catch (e) {
                                setMessages([JSON.stringify(e, null, 4)])
                                setInstallProgress('install_failed')
                            }
                        }}
                    >
                        {buttonText()}
                    </Button>
                </Tooltip>

                {installStatus === 'reinstall' && (
                    <Routing.Link
                        to="build"
                        className="w-full"
                        disabled={installProgress === 'installing'}
                    >
                        <Button
                            type={
                                installProgress === 'installing'
                                    ? 'disabled'
                                    : 'normal'
                            }
                            tw={{ width: 'w-full' }}
                        >
                            → Back to build view
                        </Button>
                    </Routing.Link>
                )}
            </div>
        </div>
    )
}
