declare const addonConfig: {
    id: string
    directoryName: string
    name: string
    description: string
    version: string
    author: string | string[]
    tags: string[]
    cssScope: 'global'
    requirements: { minHostApi: number; capabilities: string[] }
}

export default addonConfig
