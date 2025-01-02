import {
    Accordion,
    CodeInput,
    Input,
    Label,
    Select,
    Text,
    Textarea,
    Tooltip,
    useTooltip,
} from '@obsidian_blogger/design_system/components'
import { useMultipleInput } from '@obsidian_blogger/design_system/hooks'
import type {
    Bridge,
    PluginDynamicConfigPrimitiveType,
    PluginDynamicConfigSchema,
    PluginDynamicSchemaType,
    PluginInterfaceDynamicConfig,
    PluginInterfaceStaticConfig,
} from '@obsidian_blogger/plugin'
import { loadPrism } from 'obsidian'
import { useEffect, useMemo, useState } from 'react'
import { type UserPluginConfigSetter } from '../build.view'
import { Decoder } from '../core'
import { Is } from '~/utils'

const GetInitialConfig = ({
    schema,
    initialConfig,
}: {
    schema: PluginDynamicConfigSchema | undefined
    initialConfig: PluginInterfaceDynamicConfig | null
}) => {
    return Object.entries(schema ?? {}).reduce<
        Record<string, PluginDynamicConfigPrimitiveType>
    >((acc, [property, schema]) => {
        const init = initialConfig?.[property]
        const isValidInitialConfig =
            init !== undefined && init !== null && !Is.record(init)

        const isArray =
            Is.array(init) ||
            (typeof schema.type === 'string' && schema.type.includes('Array'))

        if (isArray) {
            if (
                init === '' ||
                init === undefined ||
                init === null ||
                Array.isArray(init) === false ||
                (Array.isArray(init) === true && init.length === 0)
            ) {
                acc[property] = '[]'
                return acc
            }

            const parsed = [...JSON.stringify(init)]
                .map((e) =>
                    e
                        .replace(/"/g, "'")
                        .replace(/[\n\t ]/, '')
                        .trim()
                )
                .filter(Boolean)
                .join('')

            try {
                const arrayLiteral = parsed
                acc[property] = arrayLiteral
                return acc
            } catch (e) {
                acc[property] = '[]'
                return acc
            }
        }
        acc[property] = isValidInitialConfig ? init : ''
        return acc
    }, {})
}

type PluginSchemaInfo = Exclude<
    PluginInterfaceStaticConfig['dynamicConfigSchema'],
    undefined
>[0]

interface DynamicConfigViewerProps {
    pluginName: string
    userPluginConfigSetter: UserPluginConfigSetter
    schema: PluginDynamicConfigSchema | undefined
    configStorage: Bridge.PluginConfigStorage
    initialConfig: PluginInterfaceDynamicConfig | null
    depth?: number | undefined
    accessingField?: Array<string> | undefined
}
export const DynamicConfigViewer = ({
    pluginName,
    configStorage,
    schema,
    initialConfig,
    userPluginConfigSetter,
    depth = 0,
    accessingField = [],
}: DynamicConfigViewerProps) => {
    const [, { getInput, setInput }] = useMultipleInput<
        Record<string, PluginDynamicConfigPrimitiveType>
    >(
        GetInitialConfig({
            schema,
            initialConfig,
        })
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
                            setter: (input) => {
                                setInput(
                                    property,
                                    input as PluginDynamicConfigPrimitiveType
                                )
                                const configKey =
                                    accessingField.length > 0
                                        ? `${accessingField.join('.')}.${property}`
                                        : property
                                userPluginConfigSetter(configKey, {
                                    value: input as PluginDynamicConfigPrimitiveType,
                                    decoder: (value) =>
                                        Decoder(schemaInfo, value),
                                })
                            },
                        }}
                        schemaInfo={schemaInfo}
                        viewerProps={{
                            pluginName,
                            initialConfig,
                            schema,
                            depth,
                            accessingField,
                            configStorage,
                            userPluginConfigSetter,
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
    component: 'Input' | 'Textarea' | 'CodeInput' | 'Union'
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
                component: 'Textarea',
                inputType: 'text',
            }
    }
}

interface DynamicInputProps {
    property: string
    inputManager: {
        getter: () => unknown
        setter: (input: unknown) => void | Promise<void>
    }
    schemaInfo: PluginSchemaInfo
    viewerProps: DynamicConfigViewerProps
}
const DynamicInput = ({
    property,
    inputManager,
    schemaInfo,
    viewerProps,
}: DynamicInputProps) => {
    const {
        configStorage,
        initialConfig,
        pluginName,
        accessingField,
        depth,
        userPluginConfigSetter,
    } = viewerProps

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
                        userPluginConfigSetter={userPluginConfigSetter}
                    />
                </DynamicDescription>
            </Accordion.Container>
        )
    }

    const { component } = InferInputType(type)

    const typeString =
        Is.array(type) && !Is.record(type)
            ? type.map((e) => ExtractTypename(e)).join(' | ')
            : ExtractTypename(type as string)

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

                <PrimitiveInput
                    property={property}
                    schemaInfo={{
                        type: schemaInfo.type as PluginDynamicSchemaType['primitive'],
                        description,
                        typeDescription: typeDescription ?? description,
                    }}
                    inputManager={inputManager}
                />
            </DynamicDescription>
        </Accordion.Item>
    )
}

const PrimitiveInput = ({
    property,
    schemaInfo,
    inputManager,
}: {
    property: string
    schemaInfo: Omit<PluginSchemaInfo, 'type'> & {
        type: PluginDynamicSchemaType['primitive']
    }
    inputManager: {
        getter: () => unknown
        setter: (input: unknown) => void | Promise<void>
    }
}) => {
    const { type, description, typeDescription } = schemaInfo

    const { component, inputType } = InferInputType(type)
    const { getter: inputGetter, setter: setInput } = inputManager

    const [prism, setPrism] = useState<{
        highlight: (code: string, language: string) => string
        languages: {
            javascript: string
        }
    } | null>(null)

    useEffect(() => {
        const initializePrism = async () => {
            const Prism = await loadPrism()
            setPrism(Prism)
        }
        initializePrism()
    }, [])

    return (
        <>
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
                    setInput={(input) => {
                        setInput(input)
                    }}
                />
            )}

            {component === 'Textarea' && (
                <Textarea
                    title={property}
                    description={description}
                    placeholder={typeDescription ?? description}
                    input={inputGetter() as string}
                    setInput={(input) => {
                        const parsed = input
                        setInput(parsed)
                    }}
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
                    codeHighlighter={(code) => {
                        if (!prism) return code
                        return prism.highlight(code, prism.languages.javascript)
                    }}
                    setInput={(input) => setInput(input)}
                    description={typeDescription ?? description}
                />
            )}
        </>
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

const ExtractTypename = (type: string) => {
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
            const extractedSelect = ExtractTypename(type)
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

    const isNormalInput = selectedType.startsWith('Literal') === false

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
                        setInput(ExtractTypename(input))
                    }
                }}
                options={options}
            />

            {isTypeSelected && isNormalInput && (
                <PrimitiveInput
                    property={property}
                    schemaInfo={{
                        type: selectedType,
                        description,
                        typeDescription: typeDescription ?? description,
                    }}
                    inputManager={{
                        getter: inputGetter,
                        setter: setInput,
                    }}
                />
            )}
        </div>
    )
}
