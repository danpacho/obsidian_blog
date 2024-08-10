#!/usr/bin/env node
import { Builder } from './build_core.js'
import { Publisher } from './publish_core.js'

const init = async () => {
    await Builder.init()
    await Publisher.init()
}

init()
