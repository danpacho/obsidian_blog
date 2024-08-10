#!/usr/bin/env node
import { Publisher } from './publish_core.js'

const publish = async () => {
    await Publisher.init()
    await Publisher.publish()
}

publish()
