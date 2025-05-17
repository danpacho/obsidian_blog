import type { ObsidianBloggerSettings } from '~/plugin/settings'
import { Shell } from '~/utils'

export const BuildPlugin = async ({
    node_bin,
    bridge_install_root,
}: ObsidianBloggerSettings) => {
    if (!node_bin || !bridge_install_root) return

    const buildResult = await Shell.spawn$('npm', ['run', 'build'], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    return buildResult
}

export const UpgradeBridge = async ({
    node_bin,
    bridge_install_root,
}: ObsidianBloggerSettings) => {
    if (!node_bin || !bridge_install_root) return

    const upgradeResult = await Shell.spawn$('npm', ['upgrade'], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    return upgradeResult
}

export const InitPlugin = async ({
    node_bin,
    bridge_install_root,
}: ObsidianBloggerSettings) => {
    if (!node_bin || !bridge_install_root) return

    const buildResult = await Shell.spawn$('npm', ['run', 'run:init'], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    return buildResult
}

export const ExecutePlugin = async (
    opt: ObsidianBloggerSettings & {
        command: 'run:build' | 'run:publish'
    }
) => {
    const { command, node_bin, bridge_install_root } = opt
    if (!node_bin || !bridge_install_root) return

    const buildResult = await BuildPlugin(opt)

    const isBuildError =
        buildResult === undefined ||
        ('error_code' in buildResult && buildResult.stderr !== '')

    if (isBuildError) return

    const executionResult = await Shell.spawn$('npm', ['run', command], {
        cwd: bridge_install_root,
        env: {
            PATH: `${process.env.PATH}:${node_bin}`,
        },
    })
    return executionResult
}
