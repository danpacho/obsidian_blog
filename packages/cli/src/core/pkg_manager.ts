import { ShellExecutor } from '@obsidian_blogger/helpers/shell'
import validateProjectName from 'validate-npm-package-name'

export type PkgManagerName = 'npm' | 'yarn' | 'pnpm' | 'bun'

export class PkgManager {
    private readonly $shell: ShellExecutor
    public constructor() {
        this.$shell = new ShellExecutor(100)
    }

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
     * @param pkgManager The package manager to use.
     */
    public async install(pkgManager: PkgManagerName): Promise<void> {
        const installCommands: string[] = ['install']

        await this.$shell.spawn$(pkgManager, installCommands, {
            stdio: 'inherit',
            env: {
                ...process.env,
                ADBLOCK: '1',
                // we set NODE_ENV to development as pnpm skips dev
                // dependencies when production
                NODE_ENV: 'development',
                DISABLE_OPENCOLLECTIVE: '1',
            },
        })
    }
}
