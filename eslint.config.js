// eslint.config.js
'use strict'
import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importRule from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'

/**
 * @type {import("eslint").Linter.Config}
 */
export default [
    {
        name: 'exclude-files',
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/build/**',
            '**/coverage/**',
        ],
    },
    {
        name: 'prettier',
        plugins: {
            prettier: prettier,
        },
        rules: {
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    js.configs.recommended,
    {
        name: 'common-rules', // New block for common rules
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            import: importRule, // Move import rules here to apply to all files
        },
        rules: {
            // General JavaScript/TypeScript rules
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': 'warn', // Consider 'error' for production builds

            // Import rules apply to all linted files now
            'import/order': [
                'error',
                {
                    alphabetize: { order: 'asc', caseInsensitive: true },
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                        'object',
                        'type',
                    ],
                    'newlines-between': 'always',
                    pathGroupsExcludedImportTypes: ['builtin'],
                    pathGroups: [
                        // Example: for absolute imports like `import { SomeType } from '~/types'`
                        // {
                        //     pattern: '~/**',
                        //     group: 'internal',
                        //     position: 'after',
                        // },
                    ],
                },
            ],
            'sort-imports': [
                'error',
                {
                    ignoreDeclarationSort: true, // Handled by import/order
                },
            ],
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.ts', '.jsx', '.tsx'], // Add JSX/TSX if relevant
                },
            },
        },
    },
    {
        name: 'typescript-specific', // Renamed for clarity
        ignores: ['**/*.d.ts', '**/*.d.tsx'], // Exclude declaration files
        files: ['**/*.{ts,tsx,mts,cts}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                project: true, // Assumes tsconfig.json in project root
                tsconfigRootDir: import.meta.dirname, // Crucial for ESM config
            },
        },
        plugins: {
            '@typescript-eslint': ts,
        },
        rules: {
            'no-undef': 'off', // Disable no-undef for TypeScript files
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_', // Ignore arguments starting with _
                    varsIgnorePattern: '^_', // Ignore variables starting with _
                    caughtErrorsIgnorePattern: '^_', // Ignore caught errors starting with _
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
        },
    },
]
