#!/usr/bin/env node
import { Builder } from './build_core.js'

const build = async () => {
    await Builder.init()
    await Builder.build()
}

build()
