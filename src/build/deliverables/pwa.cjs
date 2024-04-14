const { d, sortPropAsc } = require("../../shared/helper.cjs")
const Deliverable = require("../deliverable.cjs")
const { ASSET_GENERATION, RESOURCE_LOADING} = require("../config.cjs")
const { getReplaceMetaVars, getIconMimeType } = require("../helper.cjs")
const sizeOf = require("image-size")
const { NoStackError } = require("../../shared/console.cjs")

/**
 * A class for building the game as a progressive web app (PWA)
 */
class Pwa extends Deliverable {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.hasMakeStep = false
        this.isAllInOne = true
        this.hasAppIcon = true
        this.hasFavIcon = true
    }

    getConfigKeys() {
        return {
            name: {type: 'string', default: '{config.name}'},
            short_name: {type: 'string', default: '{config.shortName}'},
            description: {type: 'string', default: '{config.description}'},
            background_color: {type: 'string', default: ''},
            theme_color: {type: 'string', default: ''},
            orientation: {type: 'string', default: 'any', values: [
                    'any', 'natural', 'landscape', 'landscape-primary', 'landscape-secondary', 'portrait',
                    'portrait-primary', 'portrait-secondary'
                ]},
            display: {type: 'string', default: 'standalone', values: ['fullscreen', 'standalone', 'minimal-ui', 'browser']},
            labels: {type: 'array', subType: 'string', default: []}
        }
    }

    supportsResourceLoading(value) {
        return value === RESOURCE_LOADING.LOCAL_ALL || RESOURCE_LOADING.LOCAL_ALL
    }

    supportsAssetGeneration(value) {
        return value !== ASSET_GENERATION.NONE || ASSET_GENERATION.MINIMAL
    }

    /**
     * @inheritDoc
     */
    getMetaLinks(distTarget, configs, fileDeps) {
        return [
            ...super.getMetaLinks(distTarget, configs, fileDeps),
            {rel: 'manifest', href: "manifest.json"}
        ]
    }

    /**
     * @inheritDoc
     */
    getScriptTags(distTarget, configs, fileDeps) {
        const { metaVars } = configs
        return [
            ...super.getScriptTags(distTarget, configs, fileDeps),
            [
                `
                if ('serviceWorker' in navigator) {
                     navigator.serviceWorker.addEventListener('message', event => {
                        if (event.data.type !== 'refresh') return
                        
                        console.log('Restarting game because a new version was detected')
                        location.reload()
                     })
                     const checkRefresh = () => {
                        if (!navigator.serviceWorker.controller) return
                        navigator.serviceWorker.controller.postMessage({type: 'checkVersion', time: ${metaVars['game.buildtime']}})
                     }
                     navigator.serviceWorker.addEventListener('controllerchange', event => {
                        checkRefresh()
                     })
                     
                    checkRefresh()
                    window.addEventListener('load', () => {
                        navigator.serviceWorker.register('/service-worker.js', {updateViaCache: 'none'})
                        .then(registration => {
                            checkRefresh()
                            fetch('/service-worker.js')
                                .then(response => {
                                    if (response.ok || response.status !== 404) return
                                
                                    registration.unregister().then(() => {
                                        console.log('Restarting game because a service worker was unregistered')
                                        location.reload()
                                    })
                                })
                        })
                        .catch(e => {
                            console.log('Service worker registration failed: ' + e)
                        })
                    })
                }`
            ]
        ]
    }

    prepareAppAssets(distTarget, configs, fileDeps) {
        super.prepareAppAssets(distTarget, configs, fileDeps)
        const { syncFs, absPath } = fileDeps
        const files = syncFs.readFiles(absPath.game('assets'))
        const matchRegexp = /^screenshot[1-8](_(wide|narrow))?\.(png|jpg)$/

        const found = []
        for (const file of files) {
            if (matchRegexp.test(file)) found.push({file, order: parseInt(file[10], 10)})
        }
        if (!found.length) return
        found.sort(sortPropAsc('order'))

        const form2aspects = {
            narrow: [],
            wide: []
        }
        const screenshots = []
        for (const { file, order } of found) {
            const [ filename, ext ] = file.split('.')
            let [ name, form_factor = 'narrow' ] = filename.split('_')

            const aspects = form2aspects[form_factor]
            if (order - 1 !== aspects.length) continue

            const filePath = absPath.game('assets', file)
            const dim = sizeOf(filePath)
            if (aspects.length > 0 && (dim.width !== aspects[0].width || dim.height !== aspects[0].height))
                throw NoStackError(`Screenshot "${filePath} does not have the same size as the first screenshot with form factor ${form_factor}"`)

            aspects.push(dim)
            const label = this.config.labels[order - 1]
            screenshots.push({
                filePath,
                file,
                dim,
                label,
                form_factor,
                ext
            })
        }
        distTarget.screenshots = screenshots
    }

    /**
     * @inheritDoc
     */
    processPostBuild(distTarget, configs, fileDeps) {
        const { metaVars, config } = configs
        const { queue, absPath } = fileDeps
        const { publicDir, assets = [], screenshots = [] } = distTarget

        const pwaScreenshots = []
        for (const { filePath, file, dim, ext, label, form_factor } of screenshots) {
            pwaScreenshots.push({
                src: 'assets/' + file,
                form_factor,
                label,
                sizes: dim.width + 'x' + dim.height,
                type: getIconMimeType(ext)
            })
            queue.addCopy(filePath, absPath.dist(publicDir, 'assets', file))
        }

        const { name, description, shortName } = config
        const replaceMetaVars = getReplaceMetaVars(metaVars, { name, description, shortName })

        const pwaIcons = []
        for (const { scope, relPath, ext, dim } of assets) {
            if (scope !== 'appIcon') continue

            pwaIcons.push({
                src: relPath, sizes: dim.join('x'), type: getIconMimeType(ext)
            })
        }
        const short_name = replaceMetaVars(this.config.short_name)
        queue.addCopy(
            absPath.src('build', 'assets', 'pwa', 'service-worker.js'),
            absPath.dist(publicDir, 'service-worker.js'),
            {'[[shortname]]': short_name, '[[version]]': metaVars['game.version'], '[[buildtime]]': metaVars['game.buildtime']}
        )
        const manifest = {
            id: '/',
            name: replaceMetaVars(this.config.name),
            short_name,
            icons: pwaIcons,
            start_url: '/',
            orientation: this.config.orientation,
            description: replaceMetaVars(this.config.description),
            display: this.config.display
        }
        if (pwaScreenshots.length)
            manifest.screenshots = pwaScreenshots

        const optional = ['background_color', 'theme_color']
        for (const key of optional) {
            const value = this.config[key]
            if (value) manifest[key] = value
        }

        queue.addWriteJson(absPath.dist(publicDir, 'manifest.json'), manifest)
        queue.process()
    }
}

module.exports = Pwa