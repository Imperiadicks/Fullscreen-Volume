import { addonPlugin, defineAddonManifest } from '@pulsesync/addon-sdk/vite'
import { defineConfig } from 'vite'
import config from './addon.config.mjs'

export default defineConfig(({ mode }) => ({
    plugins: [
        addonPlugin({
            manifest: defineAddonManifest(config),
            entry: 'src/main.ts',
            minify: mode === 'development' ? false : 'oxc',
            ...(process.env.PULSESYNC_ADDON_OUT_DIR ? { outDir: process.env.PULSESYNC_ADDON_OUT_DIR } : {}),
        }),
    ],
}))
