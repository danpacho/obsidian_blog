#!/usr/bin/env node
import { BloggerCLI } from './main.js'

const REPOSITORY = 'https://github.com/danpacho/obsidian_blog' as const

BloggerCLI.instance(REPOSITORY).run()
