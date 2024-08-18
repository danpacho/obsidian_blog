import { Bridge } from '@obsidian_blogger/constants'
import {
    DynamicConfigParser,
    DynamicConfigParserError,
    PluginDynamicConfigPrimitiveType,
} from '@obsidian_blogger/helpers/arg_parser'
import {
    type PluginConfig,
    type PluginDynamicConfigSchema,
    type PluginInterfaceDynamicConfig,
} from '@obsidian_blogger/helpers/plugin'
import { Promisify } from '@obsidian_blogger/helpers/promisify'
import { useCallback, useEffect, useState } from 'react'
import { DynamicConfigViewer } from './components'
import { PluginConfigStorage } from '~/core'
import {
    Accordion,
    Button,
    Label,
    Loader,
    ProgressButton,
    Text,
    useProgressStatus,
} from '~/react/common'
import {
    BUILD_STORAGE_KEYS,
    PUBLISH_STORAGE_KEYS,
    useStorage,
} from '~/react/provider'
import { Routing } from '~/react/routing'
import { Is } from '~/utils'
import { MergeRecord } from '~/utils/merge.record'

export function BuildView() {
    const storage = useStorage()

    if (!storage.loaded) {
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

    return (
        <div className="relative flex w-full flex-col gap-4">
            <Routing.Link to="setup" className="absolute right-0 top-0">
                <Button>Setup ⚙️</Button>
            </Routing.Link>

            <div className="flex w-full flex-col items-start justify-between gap-y-2 divide-y divide-stone-400/20">
                <Text.Header>Build plugins</Text.Header>
                {BUILD_STORAGE_KEYS.map((key) => (
                    <PluginConfigView
                        key={key}
                        configStorage={storage.build!.config(key)}
                    />
                ))}
            </div>

            <div className="flex w-full flex-col items-start justify-between gap-y-2 divide-y divide-stone-400/20">
                <Text.Header>Publish plugins</Text.Header>
                {PUBLISH_STORAGE_KEYS.map((key) => (
                    <PluginConfigView
                        key={key}
                        configStorage={storage.publish!.config(key)}
                    />
                ))}
            </div>
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
            <Text.SubHeader tw={{ color: 'text-green-400' }}>
                {configStorage.options.name}
            </Text.SubHeader>

            {isEmpty && <Text.Description>No plugins found</Text.Description>}

            {!isEmpty && (
                <div className="flex w-full flex-col items-center justify-start gap-2 py-1">
                    {Object.values(configStorage.storageRecord).map((value) => {
                        return (
                            <PluginView
                                key={value.staticConfig.name}
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
        decoder?: (
            value: PluginDynamicConfigPrimitiveType
        ) => PluginDynamicConfigPrimitiveType
    }
) => void

interface PluginViewProps {
    config: PluginConfig
    configStorage: PluginConfigStorage
}

const FlattenRecord = (
    record: PluginInterfaceDynamicConfig,
    dynamicConfigSchema: PluginDynamicConfigSchema
): UserPluginConfigMap => {
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
                result.set(`${prefix}${key}`, value)
            }
        }
    }

    flatten(record, '', dynamicConfigSchema)
    return result
}
const PluginView = ({ config, configStorage }: PluginViewProps) => {
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
            return FlattenRecord(initialConfig, dynamicConfigSchema)
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
        <Accordion.Container className="flex w-full flex-col items-start gap-y-2.5 rounded-md border border-stone-700 px-2.5 py-1">
            <Accordion.Item accordionId={pluginName} className="w-full">
                <Accordion.Item.Title
                    className="flex w-full flex-row items-center justify-start gap-x-2"
                    indicator={(isActive) => (
                        <Button
                            size="sm"
                            type={pluginIncluded ? 'success' : 'error'}
                            tw={{
                                opacity: isActive
                                    ? 'opacity-100'
                                    : 'opacity-85',
                                transition: 'transition-all ease-linear',
                                transformGPU: 'transform-gpu',
                                transformRotate: isActive
                                    ? 'rotate-90'
                                    : 'rotate-0',
                                size: 'size-7',
                                transitionDuration: 'duration-300',
                                borderRadius: isActive
                                    ? 'rounded-3xl'
                                    : 'rounded',
                                alignSelf: 'self-center',
                            }}
                        >
                            ▶
                        </Button>
                    )}
                >
                    <div className="flex flex-col items-start justify-center">
                        <Text.SubHeader>{pluginName}</Text.SubHeader>
                        <Text.Description>{description}</Text.Description>
                    </div>
                </Accordion.Item.Title>

                <Accordion.Item.Content
                    className="flex flex-col items-start justify-center gap-y-0.5 overflow-x-clip pl-8"
                    disableAnimation
                >
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

                    <div className="flex w-full flex-row items-center justify-center gap-x-2">
                        <ProgressButton
                            controller={[saveStatus, setSaveStatus]}
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

                    {saveStatus.error.current &&
                        saveStatus.error.current instanceof
                            DynamicConfigParserError && (
                            <Label
                                color="red"
                                style="border"
                                tw={{
                                    marginTop: 'mt-2',
                                    paddingX: 'px-3',
                                    paddingY: 'py-2.5',
                                    maxWidth: 'max-w-full',
                                    width: 'w-full',
                                    overflow: 'overflow-x-scroll',
                                    display: 'flex',
                                    flexDirection: 'flex-col',
                                    gapY: 'gap-y-1.5',
                                    alignItems: 'items-start',
                                    justifyContent: 'justify-center',
                                    $hover: {
                                        backgroundColor: 'hover:bg-transparent',
                                    },
                                    transition: 'transition',
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
