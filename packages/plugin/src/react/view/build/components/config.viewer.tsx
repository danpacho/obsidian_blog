import type {
    PluginDynamicConfigSchema,
    PluginDynamicSchemaType,
    PluginInterfaceDynamicConfig,
    PluginInterfaceStaticConfig,
} from '@obsidian_blogger/helpers/plugin'
import { useEffect, useMemo, useState } from 'react'
import { PluginConfigStorage } from '~/core'
import {
    Accordion,
    CodeInput,
    Input,
    Label,
    Select,
    Text,
    Tooltip,
    useTooltip,
} from '~/react/common'
import { useMultipleInput } from '~/react/hooks'
import { Is } from '~/utils'

type PluginSchemaInfo = Exclude<
    PluginInterfaceStaticConfig['dynamicConfigSchema'],
    undefined
>[0]

interface DynamicConfigViewerProps {
    pluginName: string
    schema: PluginDynamicConfigSchema | undefined
    configStorage: PluginConfigStorage
    initialConfig: PluginInterfaceDynamicConfig | null
    depth?: number | undefined
    accessingField?: Array<string> | undefined
}
export const DynamicConfigViewer = ({
    pluginName,
    configStorage,
    schema,
    initialConfig,
    depth = 0,
    accessingField = [],
}: DynamicConfigViewerProps) => {
    const [, { getInput, setInput }] = useMultipleInput(
        Object.keys(schema ?? {}).reduce<Record<string, unknown>>(
            (acc, property) => {
                acc[property] = initialConfig?.[property]
                return acc
            },
            {}
        )
    )

    if (!schema) return null

    return (
        <Accordion.Container className="my-0.5 flex w-full flex-col gap-1 rounded border border-stone-400/20 p-2.5">
            {Object.entries(schema).map(([property, schemaInfo]) => {
                return (
                    <DynamicInput
                        key={property}
                        property={property}
                        inputManager={{
                            getter: () => getInput(property),
                            setter: (input) => setInput(property, input),
                        }}
                        schemaInfo={schemaInfo}
                        viewerProps={{
                            pluginName,
                            initialConfig,
                            schema,
                            depth,
                            accessingField,
                            configStorage,
                        }}
                    />
                )
            })}
        </Accordion.Container>
    )
}

const InferInputType = (
    type: PluginSchemaInfo['type']
): {
    component: 'Input' | 'CodeInput' | 'Union'
    inputType: React.InputHTMLAttributes<HTMLInputElement>['type'] | 'textarea'
} => {
    const isUnion = Is.array(type) && !Is.record(type)
    if (isUnion) {
        return {
            component: 'Union',
            inputType: 'text',
        }
    }

    switch (type) {
        case 'string':
            return {
                component: 'Input',
                inputType: 'text',
            }
        case 'number':
            return {
                component: 'Input',
                inputType: 'number',
            }
        case 'int':
            return {
                component: 'Input',
                inputType: 'number',
            }
        case 'boolean':
            return {
                component: 'Input',
                inputType: 'checkbox',
            }
        case 'RegExp':
            return {
                component: 'Input',
                inputType: 'text',
            }
        case 'Function':
            return {
                component: 'CodeInput',
                inputType: 'textarea',
            }
        default:
            return {
                component: 'Input',
                inputType: 'text',
            }
    }
}

const DynamicInput = ({
    property,
    inputManager,
    schemaInfo,
    viewerProps,
}: {
    property: string
    inputManager: {
        getter: () => unknown
        setter: (input: unknown) => void | Promise<void>
    }
    viewerProps: DynamicConfigViewerProps
    schemaInfo: PluginSchemaInfo
}) => {
    const { getter: inputGetter, setter: setInput } = inputManager

    const { configStorage, initialConfig, pluginName, accessingField, depth } =
        viewerProps

    const { type, description, typeDescription, optional } = schemaInfo

    const isRecordConfig = Is.record(type) && !Is.array(type)

    if (isRecordConfig) {
        const newAccessingField = structuredClone([...(accessingField ?? [])])
        newAccessingField.push(property)

        const newDepth = (depth ?? 0) + 1

        const innerInitialConfig =
            (initialConfig?.[property] as PluginInterfaceDynamicConfig) ?? null

        return (
            <Accordion.Container>
                <DynamicDescription
                    property={property}
                    schemaInfo={{
                        type: 'Record',
                        description,
                        typeDescription: typeDescription ?? description,
                        optional: optional ?? false,
                    }}
                >
                    <DynamicConfigViewer
                        pluginName={pluginName}
                        schema={type}
                        depth={newDepth}
                        accessingField={newAccessingField}
                        initialConfig={innerInitialConfig}
                        configStorage={configStorage}
                    />
                </DynamicDescription>
            </Accordion.Container>
        )
    }

    const { component, inputType } = InferInputType(type)

    const typeString =
        Is.array(type) && !Is.record(type)
            ? type.map((e) => extract(e)).join(' | ')
            : extract(type as string)

    return (
        <Accordion.Item
            accordionId={property}
            className="flex h-max w-full flex-col items-start justify-center gap-y-1"
        >
            <DynamicDescription
                property={property}
                schemaInfo={{
                    type: typeString,
                    description,
                    typeDescription: typeDescription ?? description,
                    optional: optional ?? false,
                }}
            >
                {component === 'Union' && (
                    <UnionInput
                        property={property}
                        inputManager={inputManager}
                        schemaInfo={
                            schemaInfo as PluginSchemaInfo & {
                                type: PluginDynamicSchemaType['union']
                            }
                        }
                    />
                )}

                {component === 'Input' && inputType === 'checkbox' && (
                    <Input
                        title={property}
                        description={description}
                        placeholder={typeDescription ?? description}
                        type="checkbox"
                        setInput={(_, e) => {
                            setInput(e.target.checked)
                        }}
                        checked={Boolean(inputGetter())}
                        tw={{
                            width: 'w-fit',
                        }}
                    />
                )}

                {component === 'Input' && inputType !== 'checkbox' && (
                    <Input
                        title={property}
                        description={description}
                        placeholder={typeDescription ?? description}
                        type={inputType}
                        input={inputGetter() as string}
                        setInput={(input) => setInput(input)}
                    />
                )}

                {component === 'CodeInput' && (
                    <CodeInput
                        title={property}
                        input={(
                            inputGetter() as
                                | RegExp
                                | ((...args: unknown[]) => unknown)
                                | Array<unknown>
                        ).toString()}
                        setInput={(input) => setInput(input)}
                        description={typeDescription ?? description}
                    />
                )}
            </DynamicDescription>
        </Accordion.Item>
    )
}

const DynamicDescription = ({
    property,
    schemaInfo,
    children,
}: React.PropsWithChildren<{
    property: string
    schemaInfo: Omit<PluginSchemaInfo, 'type'> & {
        type: string
    }
}>) => {
    const { type, description, typeDescription, optional } = schemaInfo
    const tooltipController = useTooltip({ delay: 250, position: 'right' })

    return (
        <Accordion.Item
            className="flex h-max w-full flex-col items-start justify-center gap-y-1"
            accordionId={property}
        >
            <Accordion.Item.Title className="flex flex-row items-center justify-center gap-x-1">
                <Text.SubHeader
                    tw={{
                        $hover: {
                            textDecorationLine: 'hover:underline',
                        },
                        fontWeight: 'font-normal',
                    }}
                >
                    {property}
                </Text.SubHeader>
                <Tooltip
                    {...tooltipController}
                    tw={{
                        whitespace: 'whitespace-nowrap',
                    }}
                    active={typeDescription ? tooltipController.visible : false}
                    visible={
                        typeDescription ? tooltipController.visible : false
                    }
                    tooltipContent={
                        <Label
                            color="green"
                            tw={{
                                fontFamily: 'font-mono',
                            }}
                            size="sm"
                        >
                            {typeDescription!}
                        </Label>
                    }
                >
                    <div className="flex flex-row items-center justify-center gap-x-1">
                        <Label
                            color={optional ? 'green' : 'yellow'}
                            size="sm"
                            tw={{
                                fontFamily: 'font-mono',
                                textUnderlineOffset:
                                    'underline-offset-[3.25px]',
                                $hover: {
                                    textDecorationLine: 'hover:underline',
                                },
                            }}
                        >
                            {type}
                        </Label>
                        {!optional && (
                            <Label
                                color="yellow"
                                size="sm"
                                tw={{
                                    fontFamily: 'font-mono',
                                    $hover: {
                                        textDecorationLine: 'hover:underline',
                                    },
                                    textDecorationStyle: 'decoration-wavy',
                                    textUnderlineOffset:
                                        'underline-offset-[3.25px]',
                                }}
                            >
                                required
                            </Label>
                        )}
                    </div>
                </Tooltip>
            </Accordion.Item.Title>
            <Accordion.Item.Content className="flex h-max w-full flex-col gap-y-1 pl-2.5">
                <Text.Description>{description}</Text.Description>
                {children}
            </Accordion.Item.Content>
        </Accordion.Item>
    )
}

const extract = (type: string) => {
    if (type.startsWith('Literal')) {
        return `${type.replaceAll(/[<>Literal]/g, '')}`
    }
    return type
}
const UnionInput = ({
    property,
    inputManager,
    schemaInfo,
}: {
    property: string
    inputManager: {
        getter: () => unknown
        setter: (input: unknown) => void | Promise<void>
    }
    schemaInfo: Omit<PluginSchemaInfo, 'type'> & {
        type: PluginDynamicSchemaType['union']
    }
}) => {
    const { getter: inputGetter, setter: setInput } = inputManager
    const { type: union, description, typeDescription } = schemaInfo

    const [selectedType, setSelectedType] = useState<
        PluginDynamicSchemaType['primitive'] | null
    >(null)

    const options = useMemo(() => {
        return union.map((type) => {
            const extractedSelect = extract(type)
            return {
                label: extractedSelect,
                value: type,
            }
        })
    }, [])

    const isTypeSelected = selectedType !== null

    useEffect(() => {
        const defaultValue =
            (options
                .map(({ label }) => {
                    const isInitialValueLiteral = inputGetter() === label
                    if (isInitialValueLiteral) {
                        return `Literal<${label}>`
                    }
                    return null
                })
                .filter(
                    (e) => e !== null
                )[0] as PluginDynamicSchemaType['primitive']) ?? null

        setSelectedType(defaultValue)
    }, [])

    if (!isTypeSelected) {
        return (
            <Select
                title={property}
                input={selectedType ?? ''}
                defaultValue={selectedType ?? undefined}
                setInput={(input) =>
                    setSelectedType(
                        input as PluginDynamicSchemaType['primitive']
                    )
                }
                options={options}
            />
        )
    }

    const extracted = extract(selectedType)
    const isNormalInput = selectedType.startsWith('Literal') === false
    const { component, inputType } = InferInputType(selectedType)

    return (
        <div className="flex w-full flex-col items-start justify-center gap-y-1">
            <Select
                title={property}
                input={selectedType}
                setInput={(input) => {
                    if (!input) return
                    setSelectedType(
                        input as PluginDynamicSchemaType['primitive']
                    )
                    const isLiteral = input.startsWith('Literal')
                    if (isLiteral) {
                        setInput(extract(input))
                    }
                }}
                options={options}
            />

            {isTypeSelected && (
                <>
                    {component === 'Input' && inputType === 'checkbox' && (
                        <Input
                            type="checkbox"
                            title={property}
                            description={description}
                            placeholder={typeDescription ?? extracted}
                            setInput={(_, e) => {
                                setInput(e.target.checked)
                            }}
                            checked={Boolean(inputGetter())}
                            tw={{
                                width: 'w-fit',
                            }}
                        />
                    )}

                    {component === 'Input' &&
                        inputType !== 'checkbox' &&
                        isNormalInput && (
                            <Input
                                type={inputType}
                                title={property}
                                description={description}
                                placeholder={typeDescription ?? extracted}
                                input={inputGetter() as string}
                                setInput={(input) => setInput(input)}
                            />
                        )}

                    {component === 'CodeInput' && (
                        <CodeInput
                            title={property}
                            description={typeDescription ?? description}
                            input={(
                                inputGetter() as
                                    | RegExp
                                    | ((...args: unknown[]) => unknown)
                                    | Array<unknown>
                            ).toString()}
                            setInput={(input) => setInput(input)}
                        />
                    )}
                </>
            )}
        </div>
    )
}
