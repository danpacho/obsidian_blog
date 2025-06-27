import validateProjectName from 'validate-npm-package-name'

import type { ShellExecutor } from '@obsidian_blogger/helpers/shell'

export type PkgManagerName = 'npm' | 'yarn' | 'pnpm' | 'bun'

export class PkgManager {
    public constructor(private readonly $shell: ShellExecutor) {}

    public isValidPkg(name: string):
        | {
              isValid: true
          }
        | {
              isValid: false
              problems: Array<string>
          } {
        const isValidNpmPkg = validateProjectName(name)
        if (isValidNpmPkg.validForNewPackages) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: false,
            problems: [
                ...(isValidNpmPkg.errors ?? []),
                ...(isValidNpmPkg.warnings ?? []),
            ],
        }
    }

    public getPkgManager(): PkgManagerName {
        /**
        const userAgent = process.env.npm_config_user_agent || ''

        if (userAgent.startsWith('yarn')) {
            return 'yarn'
        }

        if (userAgent.startsWith('pnpm')) {
            return 'pnpm'
        }

        if (userAgent.startsWith('bun')) {
            return 'bun'
        }
        */

        // currently only npm is supported
        return 'npm'
    }

    /**
     * Runs a command using the package manager.
     * @param pkgManager - The package manager to use.
     * @param commands - The commands to run.
     * @param options - The options to use when running the command.
     */
    public async run(
        pkgManager: PkgManagerName,
        commands: Array<string>,
        options?: {
            spawn?: Parameters<ShellExecutor['spawn$']>[2]
        }
    ): Promise<void> {
        await this.$shell.spawn$(pkgManager, commands, {
            stdio: 'inherit',
            ...options?.spawn,
            env: {
                ...options?.spawn?.env,
                ...process.env,
                ADBLOCK: '1',
                // we set NODE_ENV to development as pnpm skips dev
                // dependencies when production
                NODE_ENV: 'development',
                DISABLE_OPENCOLLECTIVE: '1',
            },
        })
    }

    /**
     * Installs the dependencies using the package manager.
     * @param pkgManager - The package manager to use.
     * @param options - The options to use when running the command.
     */
    public async install(
        pkgManager: PkgManagerName,
        options?: {
            commands?: string
            spawn?: Parameters<ShellExecutor['spawn$']>[2]
        }
    ): Promise<void> {
        const installCommands: string[] = options?.commands
            ? ['install', options.commands]
            : ['install']

        await this.run(pkgManager, installCommands, {
            spawn: options?.spawn,
        })
    }
}
