import {
    Accordion,
    Button,
    Label,
    Loader,
    ProgressButton,
    Text,
    useProgressStatus,
} from '@obsidian_blogger/design_system/components'
import { Promisify } from '@obsidian_blogger/helpers/promisify'
import {
    type PluginConfig,
    type PluginDynamicConfigSchema,
    type PluginInterfaceDynamicConfig,
} from '@obsidian_blogger/plugin_api'
import {
    DynamicConfigParser,
    DynamicConfigParserError,
    type PluginDynamicConfigPrimitiveType,
} from '@obsidian_blogger/plugin_api/arg_parser'
import type {
    BuildBridgeHistoryRecord,
    BuildBridgeHistoryValue,
    BuildBridgeStorage,
    PluginConfigStorage,
} from '@obsidian_blogger/plugin_api/bridge'
import { Bridge } from '@obsidian_blogger/plugin_api/constants'
import React, { useCallback, useEffect, useState } from 'react'
import { DynamicConfigViewer } from './components'
import { Decoder, type DecoderAdapter } from './core'
import type { ObsidianBloggerSettings } from '~/plugin/settings'
import { useObsidianSetting } from '~/react/hooks'
import {
    BUILD_STORAGE_KEYS,
    type BuildStorageKeys,
    PUBLISH_STORAGE_KEYS,
    type PublishStorageKeys,
    useStorage,
} from '~/react/provider'
import { Routing } from '~/react/routing'
import { Is, Shell } from '~/utils'
import { MergeRecord } from '~/utils/merge.record'

export function BuildView() {
    const storage = useStorage()
    const { loaded: settingLoaded, settings } = useObsidianSetting()

    useEffect(() => {
        storage.build?.load()
        storage.publish?.load()
    }, [])

    if (!storage.loaded || !settingLoaded) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Label
                    color="blue"
                    size="lg"
                    tw={{
                        display: 'flex',
                        flexDirection: 'flex-row',
                        gap: 'gap-2',
                        alignItems: 'items-center',
                        justifyContent: 'justify-center',
                        borderRadius: 'rounded-lg',
                        animation: 'animate-pulse',
                    }}
                >
                    Loading... <Loader />
                </Label>
            </div>
        )
    }

    if (!settings) {
        return null
    }

    return (
        <div className="relative flex w-full flex-col gap-4 pb-10">
            <PluginExecutionView
                type="Build"
                storage={storage.build!}
                storageKeys={BUILD_STORAGE_KEYS}
                {...settings}
            />
            <PluginExecutionView
                type="Publish"
                storage={storage.publish!}
                storageKeys={PUBLISH_STORAGE_KEYS}
                {...settings}
            />

            <Routing.Link to="setup" className="absolute bottom-0 right-0">
                <Button>Setup ⚙️</Button>
            </Routing.Link>
        </div>
    )
}

const ExecutePlugin = async ({
    command,
    node_bin,
    bridge_install_root,
}: ObsidianBloggerSettings & {
    command: 'run:build' | 'run:publish'
}) => {
    if (!node_bin || !bridge_install_root) return

    const npmPath = `${node_bin}/npm`
    const buildResult = await Shell.spawn$(npmPath, ['run', 'build'], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    const isBuildError =
        buildResult === undefined ||
        ('error_code' in buildResult && buildResult.stderr !== '')

    if (isBuildError) return

    const executionResult = await Shell.spawn$(npmPath, ['run', command], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    return executionResult
}

const HistoryContext = React.createContext<BuildBridgeHistoryRecord | null>(
    null
)
const usePluginHistory = ({
    storageName,
    pluginName,
}: {
    storageName: string
    pluginName: string
}): BuildBridgeHistoryValue[number] | null => {
    const context = React.useContext(HistoryContext)
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider')
    }
    if (!context) return null

    return (
        context[storageName]?.find((job) => job.jobName === pluginName) ?? null
    )
}

const PluginExecutionView = ({
    type,
    storage,
    storageKeys,
    ...settings
}: {
    type: 'Build' | 'Publish'
    storage: BuildBridgeStorage<Array<BuildStorageKeys | PublishStorageKeys>>
    storageKeys: Array<BuildStorageKeys | PublishStorageKeys>
} & ObsidianBloggerSettings) => {
    const [progress, setProgress] = useProgressStatus()
    const [allPluginHistory, setAllPluginHistory] =
        useState<BuildBridgeHistoryRecord | null>(null)

    useEffect(() => {
        const unsubscribe = storage.subscribeHistory((newHistory) => {
            setAllPluginHistory(newHistory)
        })
        storage.watchHistory()

        return () => {
            unsubscribe()
            storage.stopWatchingHistory()
        }
    }, [])

    return (
        <div className="flex w-full flex-col items-start justify-between gap-y-2 divide-y divide-stone-400/20">
            <div className="flex flex-col items-start justify-center w-full">
                <div className="flex flex-row items-center justify-start w-full gap-x-2 py-2">
                    <Text.Header>{type} plugins</Text.Header>
                    <ProgressButton
                        idleRecoverTime={2500}
                        controller={[progress, setProgress]}
                        onStatusChange={(status) => {
                            switch (status) {
                                case 'idle':
                                    return 'Run'
                                case 'progress':
                                    return (
                                        <>
                                            <Loader />
                                            Running...
                                        </>
                                    )
                                case 'success':
                                    return 'Success'
                                case 'error':
                                    return 'Error'
                            }
                        }}
                        startProgress={async () => {
                            try {
                                const pluginExecutionResponse =
                                    await ExecutePlugin({
                                        ...settings,
                                        command: `run:${type.toLowerCase() as 'build' | 'publish'}`,
                                    })

                                if (!pluginExecutionResponse)
                                    return {
                                        success: false,
                                        error: new Error(
                                            'Plugin execution failed'
                                        ),
                                    }

                                const isError =
                                    pluginExecutionResponse === undefined ||
                                    ('error_code' in pluginExecutionResponse &&
                                        pluginExecutionResponse.stderr !== '')

                                if (isError) {
                                    return {
                                        success: false,
                                        error: pluginExecutionResponse
                                            ? new Error(
                                                  pluginExecutionResponse.stderr
                                              )
                                            : new Error(
                                                  'Node bin or bridge install root is not set',
                                                  {
                                                      cause: settings,
                                                  }
                                              ),
                                    }
                                }

                                return {
                                    success: true,
                                    data: undefined,
                                }
                            } catch (e) {
                                return {
                                    success: false,
                                    error: e,
                                }
                            }
                        }}
                    />
                </div>

                {progress.error.current && (
                    <div className="bg-black rounded-xs border flex flex-col gap-y-2 border-neutral-800 p-2 w-full overflow-x-scroll">
                        <Text.Description
                            tw={{
                                color: 'text-red-400',
                                fontFamily: 'font-mono',
                            }}
                        >
                            {progress.error.current.message}
                        </Text.Description>
                        <Text.Description
                            tw={{
                                color: 'text-red-400',
                                fontFamily: 'font-mono',
                            }}
                        >
                            {JSON.stringify(
                                progress.error.current.cause,
                                null,
                                4
                            )}
                        </Text.Description>
                    </div>
                )}
            </div>

            <HistoryContext.Provider value={allPluginHistory}>
                {storageKeys.map((key) => (
                    <PluginConfigView
                        key={key}
                        configStorage={storage.config(key)}
                    />
                ))}
            </HistoryContext.Provider>
        </div>
    )
}

const PluginConfigView = ({
    configStorage,
}: {
    configStorage: PluginConfigStorage
}) => {
    if (!configStorage) return null

    const isEmpty = configStorage.storage.size === 0

    return (
        <div className="flex h-max w-full flex-col items-start gap-y-2.5 py-2">
            <Text.SubHeader>{configStorage.options.name}</Text.SubHeader>

            {isEmpty && <Text.Description>No plugins found</Text.Description>}

            {!isEmpty && (
                <div className="flex w-full flex-col items-center justify-start gap-2 py-1">
                    {Object.values(configStorage.storageRecord).map((value) => {
                        const pluginName = value.staticConfig.name
                        return (
                            <PluginView
                                key={pluginName}
                                config={value}
                                configStorage={configStorage}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const ExtractDefaultConfig = (
    schema: PluginDynamicConfigSchema
): PluginInterfaceDynamicConfig => {
    return Object.entries(schema).reduce<PluginInterfaceDynamicConfig>(
        (acc, [key, value]) => {
            const { type, defaultValue } = value
            if (Is.record(type) && !Is.array(type)) {
                acc[key] = ExtractDefaultConfig(type)
                return acc
            }
            const isArray =
                Is.array(defaultValue) ||
                (typeof type === 'string' && type.includes('Array'))

            if (isArray) {
                if (
                    defaultValue === '' ||
                    defaultValue === undefined ||
                    defaultValue === null ||
                    Array.isArray(defaultValue) === false
                ) {
                    acc[key] = []
                    return acc
                }

                acc[key] = defaultValue
            }

            acc[key] = defaultValue ?? ''
            return acc
        },
        {}
    )
}
const ConfigParser = new DynamicConfigParser()

export type UserPluginConfigMap = Map<string, PluginDynamicConfigPrimitiveType>
export type UserPluginConfigSetter = (
    key: string,
    config: {
        value: PluginDynamicConfigPrimitiveType
        decoder?: DecoderAdapter
    }
) => void

const FlattenDynamicConfig = ({
    dynamicConfig,
    dynamicConfigSchema,
}: {
    dynamicConfig: PluginInterfaceDynamicConfig
    dynamicConfigSchema: PluginDynamicConfigSchema
}): UserPluginConfigMap => {
    const result = new Map<string, PluginDynamicConfigPrimitiveType>()

    const flatten = (
        record: PluginInterfaceDynamicConfig,
        prefix: string,
        dynamicConfigSchema: PluginDynamicConfigSchema | undefined = undefined
    ) => {
        for (const [key, value] of Object.entries(record)) {
            if (Is.record(value) && !Is.array(value)) {
                const schemaInfo = dynamicConfigSchema![key]?.type
                if (!schemaInfo) return
                const isSchemaRecord =
                    Is.record(schemaInfo) && !Is.array(schemaInfo)

                if (isSchemaRecord) {
                    flatten(value, `${prefix}${key}.`, schemaInfo)
                }
            } else {
                const targetSchema = dynamicConfigSchema?.[key]
                if (!targetSchema) return

                const decodedValue: PluginDynamicConfigPrimitiveType = Decoder(
                    targetSchema,
                    value
                )
                result.set(`${prefix}${key}`, decodedValue)
            }
        }
    }

    flatten(dynamicConfig, '', dynamicConfigSchema)
    return result
}

interface PluginViewProps {
    config: PluginConfig
    configStorage: PluginConfigStorage
}
const PluginView = ({ config, configStorage }: PluginViewProps) => {
    const history = usePluginHistory({
        storageName: configStorage.options.name,
        pluginName: config.staticConfig.name,
    })

    const [pluginHistory, setPluginHistory] = useState<
        BuildBridgeHistoryValue[number] | null
    >(null)

    useEffect(() => {
        setPluginHistory(history)
    }, [history])

    const runningState = {
        pending:
            (pluginHistory !== null && pluginHistory?.status === 'pending') ||
            (pluginHistory !== null && pluginHistory?.status === 'started'),
        executing:
            pluginHistory !== null && pluginHistory?.status === 'started',
        success: pluginHistory !== null && pluginHistory?.status === 'success',
        failed: pluginHistory !== null && pluginHistory?.status === 'failed',
    }

    const [pluginIncluded, setPluginIncluded] = useState<boolean>(true)

    const { staticConfig, dynamicConfig } = config
    const { name: pluginName, description, dynamicConfigSchema } = staticConfig

    const defaultDynamicConfig: PluginInterfaceDynamicConfig =
        dynamicConfigSchema ? ExtractDefaultConfig(dynamicConfigSchema) : {}

    const initialConfig: PluginInterfaceDynamicConfig = dynamicConfig
        ? MergeRecord(defaultDynamicConfig, dynamicConfig)
        : defaultDynamicConfig

    // userDynamicConfig: updated config from user
    const [userDynamicConfig, setUserDynamicConfig] =
        useState<UserPluginConfigMap>(() => {
            if (!dynamicConfigSchema) return new Map()
            return FlattenDynamicConfig({
                dynamicConfig: initialConfig,
                dynamicConfigSchema,
            })
        })

    const configSetter: UserPluginConfigSetter = useCallback(
        (key, config): void => {
            setUserDynamicConfig((prev) => {
                const newConfig = new Map(prev)
                const configValue = config.decoder
                    ? config.decoder(config.value)
                    : config.value
                newConfig.set(key, configValue)
                return newConfig
            })
        },
        []
    )

    const [saveStatus, setSaveStatus] = useProgressStatus()

    const updatePluginDynamicConfig = useCallback(
        async ({
            configStorage,
            updatedConfigMap,
            pluginIncluded,
        }: {
            pluginIncluded: boolean
            updatedConfigMap: UserPluginConfigMap
            configStorage: PluginConfigStorage
        }): Promisify<void, DynamicConfigParserError> => {
            const updatedConfigRecord: PluginInterfaceDynamicConfig = {}
            for (const [key, value] of updatedConfigMap) {
                const paths: Array<string> = key.split('.')
                paths.reduce<PluginInterfaceDynamicConfig>(
                    (acc, path, index) => {
                        if (index === paths.length - 1) {
                            acc[path] = value
                            return acc
                        }
                        if (!acc[path]) {
                            acc[path] = {}
                        }
                        return acc[path] as PluginInterfaceDynamicConfig
                    },
                    updatedConfigRecord
                )
            }

            const validatedResult = ConfigParser.parse(
                dynamicConfigSchema!,
                updatedConfigRecord
            )

            const mergedConfig: Bridge.USER_PLUGIN_LOAD_INPUT = {
                ...updatedConfigRecord,
                $$load_status$$: pluginIncluded ? 'include' : 'exclude',
            }

            if (validatedResult.success) {
                await configStorage.updateDynamicConfigByUserConfig(
                    pluginName,
                    mergedConfig
                )
                return {
                    success: true,
                    data: undefined,
                }
            } else {
                return {
                    success: false,
                    error: validatedResult.error,
                }
            }
        },
        []
    )

    useEffect(() => {
        const initializePlugin__$$load_status$$ = async () => {
            const inquired = configStorage.storageRecord[pluginName]
            if (!inquired) return

            const { dynamicConfig } = inquired
            if (dynamicConfig !== null && dynamicConfig !== undefined) {
                if ('$$load_status$$' in dynamicConfig) {
                    const { $$load_status$$ } = dynamicConfig
                    if ($$load_status$$ === 'exclude') {
                        setPluginIncluded(false)
                    } else if ($$load_status$$ === 'include') {
                        setPluginIncluded(true)
                    }
                }
            } else {
                setPluginIncluded(true)
                await configStorage.updateSinglePluginLoadStatus(
                    pluginName,
                    'include'
                )
            }
        }

        initializePlugin__$$load_status$$()
    }, [])

    return (
        <Accordion.Container className="flex w-full flex-col items-start gap-y-2.5 rounded-md border border-stone-700 p-1">
            <Accordion.Item accordionId={pluginName} className="w-full">
                <Accordion.Item.Title
                    className="flex w-full flex-row items-center justify-start gap-x-2 rounded px-1.5 hover:bg-stone-400/10"
                    indicator={(isActive) => {
                        const status = runningState.pending
                            ? 'warn'
                            : pluginIncluded
                              ? 'success'
                              : 'error'

                        return (
                            <Button
                                size="sm"
                                type={status}
                                tw={{
                                    transitionProperty: 'transition-all',
                                    transitionTimingFunction: 'ease-linear',
                                    transform: 'transform-gpu',
                                    rotate: isActive ? 'rotate-90' : 'rotate-0',
                                    opacity: isActive
                                        ? 'opacity-100'
                                        : 'opacity-85',
                                    width: 'size-7',
                                    transitionDuration: runningState.pending
                                        ? 'duration-[0]'
                                        : 'duration-300',
                                    borderRadius: runningState.pending
                                        ? 'rounded-3xl'
                                        : isActive
                                          ? 'rounded-3xl'
                                          : 'rounded',
                                    alignSelf: 'self-center',
                                }}
                            >
                                {runningState.pending && (
                                    <Loader color="yellow" size="sm" />
                                )}
                                {!runningState.pending && '▶'}
                            </Button>
                        )
                    }}
                >
                    <div className="flex flex-col items-start justify-center">
                        <Text.SubHeader
                            tw={{
                                color: runningState.pending
                                    ? 'text-yellow-300'
                                    : 'text-stone-300',
                                animation: runningState.pending
                                    ? 'animate-pulse'
                                    : 'animate-none',
                            }}
                        >
                            {pluginName}
                        </Text.SubHeader>
                        <Text.Description>{description}</Text.Description>
                    </div>
                </Accordion.Item.Title>

                <Accordion.Item.Content
                    className={`flex flex-col items-start justify-center gap-y-0.5 overflow-x-clip pl-8 pt-1`}
                    disableAnimation
                >
                    <PluginHistoryViewer history={pluginHistory} />

                    {dynamicConfigSchema && (
                        <DynamicConfigViewer
                            schema={dynamicConfigSchema}
                            initialConfig={initialConfig}
                            pluginName={staticConfig.name}
                            configStorage={configStorage}
                            userPluginConfigSetter={configSetter}
                        />
                    )}

                    {!dynamicConfigSchema && (
                        <Label color="yellow">Static Configuration only</Label>
                    )}

                    {dynamicConfigSchema && (
                        <div className="flex w-full flex-row items-center justify-center gap-x-2">
                            <ProgressButton
                                controller={[saveStatus, setSaveStatus]}
                                disabled={runningState.pending}
                                onStatusChange={(status) => {
                                    switch (status) {
                                        case 'progress':
                                            return (
                                                <>
                                                    <Loader />
                                                    Saving...
                                                </>
                                            )
                                        case 'success':
                                            return 'Config Saved'
                                        case 'error':
                                            return 'Config Error'
                                        case 'idle':
                                            return 'Save Config'
                                    }
                                }}
                                startProgress={async () => {
                                    return await updatePluginDynamicConfig({
                                        configStorage,
                                        updatedConfigMap: userDynamicConfig,
                                        pluginIncluded,
                                    })
                                }}
                                tw={{
                                    width: 'w-full',
                                }}
                            />

                            <Button
                                tw={{
                                    width: 'w-full',
                                    textDecorationLine: pluginIncluded
                                        ? 'no-underline'
                                        : 'underline',
                                    textDecorationStyle: 'decoration-wavy',
                                    textUnderlineOffset:
                                        'underline-offset-[3.25px]',
                                    textDecorationColor: 'decoration-white/50',
                                }}
                                disabled={runningState.pending}
                                type={pluginIncluded ? 'success' : 'error'}
                                onClick={() => {
                                    setPluginIncluded((prev) => !prev)
                                }}
                            >
                                {pluginIncluded
                                    ? 'Exclude Plugin'
                                    : 'Include Plugin'}
                            </Button>
                        </div>
                    )}

                    {saveStatus.error.current &&
                        saveStatus.error.current instanceof
                            DynamicConfigParserError && (
                            <Label
                                color="red"
                                style="border"
                                tw={{
                                    margin: 'mt-2',
                                    padding: ['px-3', 'py-2.5'],
                                    maxWidth: 'max-w-full',
                                    width: 'w-full',
                                    overflow: 'overflow-x-scroll',
                                    display: 'flex',
                                    flexDirection: 'flex-col',
                                    gap: 'gap-y-1.5',
                                    alignItems: 'items-start',
                                    justifyContent: 'justify-center',
                                    $hover: {
                                        backgroundColor: 'hover:bg-transparent',
                                    },
                                    transitionProperty: 'transition',
                                }}
                            >
                                <Text.SubHeader>Expected</Text.SubHeader>
                                <Text.Code
                                    tw={{
                                        color: 'text-red-400',
                                    }}
                                >
                                    {JSON.stringify(
                                        JSON.parse(
                                            saveStatus.error.current.expected
                                        ),
                                        null,
                                        2
                                    )}
                                </Text.Code>
                                <Text.SubHeader>ErrorPath</Text.SubHeader>
                                <Text.Code
                                    tw={{
                                        color: 'text-red-400',
                                        textDecorationLine: 'underline',
                                        textDecorationStyle: 'decoration-wavy',
                                        textUnderlineOffset:
                                            'underline-offset-4',
                                    }}
                                >
                                    {saveStatus.error.current.path.join('.')}
                                </Text.Code>
                                <Text.SubHeader>Received</Text.SubHeader>
                                <Text.Code
                                    tw={{
                                        color: 'text-red-400',
                                    }}
                                >
                                    {String(saveStatus.error.current.received)}
                                </Text.Code>
                            </Label>
                        )}
                </Accordion.Item.Content>
            </Accordion.Item>
        </Accordion.Container>
    )
}

const HistoryProperty = ({
    title,
    property,
}: {
    title: string
    property: string | undefined
}) => {
    if (!property) return null

    return (
        <div className="flex flex-row items-center justify-center gap-x-2">
            <Label
                color="blue"
                size="sm"
                tw={{
                    fontFamily: 'font-mono',
                }}
            >
                {title}
            </Label>
            <Text.Description>{property}</Text.Description>
        </div>
    )
}

const PluginHistoryViewer = ({
    history,
}: {
    history: BuildBridgeHistoryValue[number] | null
}) => {
    if (!history) return null

    const { jobName, status, execTime, endedAt, startedAt, error, response } =
        history

    return (
        <Accordion.Container className="w-full rounded border border-stone-400/20 p-1.5">
            <Accordion.Item
                initialOpen
                accordionId={`${jobName}-history`}
                className="flex w-full flex-col items-start justify-center gap-y-2"
            >
                <Accordion.Item.Title className="flex w-full flex-row items-center justify-start gap-x-2 rounded px-1 hover:bg-stone-400/10">
                    <Text.SubHeader
                        tw={{
                            fontFamily: 'font-sans',
                            $hover: {
                                textDecorationLine: 'hover:underline',
                            },
                            fontWeight: 'font-semibold',
                        }}
                    >
                        Result
                    </Text.SubHeader>
                </Accordion.Item.Title>

                <Accordion.Item.Content
                    className="flex w-full flex-col items-start justify-center gap-y-2 pl-3.5"
                    disableAnimation
                >
                    <HistoryProperty
                        title="Started"
                        property={
                            startedAt && new Date(startedAt).toLocaleString()
                        }
                    />
                    <HistoryProperty
                        title="Ended"
                        property={endedAt && new Date(endedAt).toLocaleString()}
                    />

                    <HistoryProperty title="Status" property={status} />
                    <HistoryProperty
                        title="Execution Time"
                        property={
                            typeof execTime === 'number'
                                ? `${execTime / 1000}s`
                                : undefined
                        }
                    />

                    <Accordion.Container className="w-full overflow-hidden">
                        <Accordion.Item
                            className="w-full"
                            accordionId={`${jobName}-response-or-error`}
                        >
                            <Accordion.Item.Title className="flex flex-row items-center justify-start gap-x-2">
                                <Label
                                    color={status === 'failed' ? 'red' : 'blue'}
                                    size="sm"
                                    tw={{
                                        fontFamily: 'font-mono',
                                    }}
                                >
                                    {status === 'failed' ? 'Error' : 'Response'}
                                </Label>
                                <Label
                                    color="gray"
                                    size="sm"
                                    tw={{
                                        fontFamily: 'font-mono',
                                    }}
                                >
                                    JSON
                                </Label>
                            </Accordion.Item.Title>
                            <Accordion.Item.Content className="w-full">
                                <Label
                                    color={status === 'failed' ? 'red' : 'blue'}
                                    style="border"
                                    tw={{
                                        margin: 'mt-2',
                                        padding: ['px-3', 'py-2.5'],
                                        maxWidth: 'max-w-full',
                                        width: 'w-full',
                                        overflow: 'overflow-x-scroll',
                                        display: 'flex',
                                        flexDirection: 'flex-col',
                                        gap: 'gap-y-1.5',
                                        alignItems: 'items-start',
                                        justifyContent: 'justify-center',
                                        $hover: {
                                            backgroundColor:
                                                'hover:bg-transparent',
                                        },
                                        transitionProperty: 'transition',
                                    }}
                                >
                                    <Text.Code
                                        tw={{
                                            color:
                                                status === 'failed'
                                                    ? 'text-red-400'
                                                    : 'text-blue-400',
                                        }}
                                    >
                                        {JSON.stringify(
                                            status === 'failed'
                                                ? error
                                                : response,
                                            null,
                                            2
                                        )}
                                    </Text.Code>
                                </Label>
                            </Accordion.Item.Content>
                        </Accordion.Item>
                    </Accordion.Container>
                </Accordion.Item.Content>
            </Accordion.Item>
        </Accordion.Container>
    )
}
