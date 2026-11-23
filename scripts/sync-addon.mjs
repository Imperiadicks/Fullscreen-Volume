import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { deliverAddon, formatDeliveryResult } from './addon-delivery.mjs'

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : scriptRoot
const { default: addonConfig } = await import(pathToFileURL(path.join(rootDir, 'addon.config.mjs')).href)
const sourceDir = path.join(rootDir, 'dist', addonConfig.directoryName)

async function main() {
    const result = await deliverAddon(sourceDir, addonConfig)
    console.log(formatDeliveryResult(result))
    console.log(`Addon directory: ${result.targetDir}`)
}

main().catch(error => {
    console.error('Failed to sync addon:', error)
    process.exitCode = 1
})
