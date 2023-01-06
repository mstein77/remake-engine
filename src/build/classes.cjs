const { RESOURCE, DEPLOY } = require('./classes/config.cjs')
const absPath = require('./classes/absPath.cjs')
const syncFs = require('./classes/syncFs.cjs')

/**
 *  hosting: gibt den Hosting-Anbieter bzw. die Art des hostings
 *  deploy: gibt an auf welchen weg, die dist-dateien auf dem server ausgerollt werden soll (upload, checkout)
 *  server: gibt an, ob ein eigener node-js server gestartet werden soll (benötigt nodejs)
 *    - wird kein server gestartet, wird der http server des hosters verwendet
 *      und alle resourcen werden direkt von diesem geladen
 *  editor: gib an, ob ein editor mitgeliefert werden soll (deployment ist immer nur im DEV-Modus möglich)
 *  packageType: "webapp", "bundle", "pwa"
 *  resourceType: "raw", "base64"
 *
 *
 */
class Hosting {

    constructor(config, isDist) {
        this.config = config
        this.supports = {
            nodejs: true,
            manualUpload: true,
            checkout: true,
            pwa: true
        }
        this.isDist = isDist
        this.deployMethod = config.deployMethod
        this.editor = config.editor
        this.server = config.server
        this.messages = []
        this.copyPatterns = []

        this.init(config)

        this.cleanUp()

        if (isDist) {
            if (this.server && !this.supportsNodejs)
                this.throw('Server requires nodejs! Disable "server" in your dist config or use a hosting which supports nodejs!')
            if ([DEPLOY.METHOD.UPLOAD_PUBLIC, DEPLOY.METHOD.UPLOAD_ROOT].includes(config.deployMethod) && !this.supportsManualUpload)
                this.throw(`You selected "${config.deployMethod}" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!`)
            if (this.deployMethod === DEPLOY.METHOD.CHECKOUT && !this.supportsCheckout)
                this.throw('You selected "checkout" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!')

            const resourceDirs = ['audio', 'image', 'json']
            const rawResources = ['audio']

            const staticResources = (!this.server || config.resourceLoading === RESOURCE.LOADING.STATIC) ? [ ...resourceDirs ] : rawResources

            for (const dir of resourceDirs) {
                const from = absPath.resources(dir)
                if (syncFs.isEmptyDir(from)) continue
                this.copyPatterns.push({
                    from,
                    to: staticResources.includes(dir) ? this.publicDir + '/' + dir : absPath.dist('resources', dir)
                })
            }
            if (config.resourceLoading === RESOURCE.LOADING.API) {
                for (const file of ['indirect.json', 'direct.json']) {
                    const from = absPath.resources(file)
                    if (!syncFs.fileExists(from)) continue
                    this.copyPatterns.push({from, to: absPath.dist('resources', file) })
                }
            }
            if (this.deployMethod === DEPLOY.METHOD.UPLOAD_PUBLIC) {
                this.messages.push(`Upload the content of "${absPath.dist()}" to the public folder of your http web-server`)
            }
            if (this.server && [DEPLOY.METHOD.UPLOAD_ROOT, DEPLOY.METHOD.CHECKOUT].includes(this.deployMethod)) {
                const distPackageJsonPath = absPath.tmp('package.json')
                syncFs.writeJson(distPackageJsonPath, {
                    name: 'game',
                    version: '1.0.0',
                    dependencies: {
                        express: '^4.18.2'
                    }
                });
                this.copyPatterns.push({from: distPackageJsonPath, to: absPath.dist('package.json')})
                if (this.deployMethod === DEPLOY.METHOD.UPLOAD_ROOT) {
                    this.messages.push(`Upload the content of "${absPath.dist()}" to the document root folder of your http web-server`);
                    this.messages.push(`Afterwards execute "npm install" in this directory`);
                } else {
                    this.messages.push(`Checkout your game repo on your web server manually or automatically`);
                    this.messages.push(`Afterwards execute "npm start" in the root directory of your web server`);
                }
            }
            return
        }
        if (this.deployMethod === 'checkout') {
            this.generateRepoFiles()
        }
    }

    addCopyPattern(from, to) {
        if (syncFs.exists(from)) {
            this.copyPatterns.push({ from, to })
        }
    }

    cleanUp() {
        if (this.isDist) syncFs.clearDir(absPath.dist())
        syncFs.clearDir(absPath.tmp())
    }

    init(config) {}

    throw(msg) {
        throw new Error(msg)
    }

    writeFileContent(filePath, content) {}

    get supportsNodejs() {
        return this.supports.nodejs
    }

    get supportsManualUpload() {
        return this.supports.manualUpload
    }

    get supportsCheckout() {
        return this.supports.checkout
    }

    get publicDir() {
        return absPath.dist(this.server ? 'public' : '')
    }

    get postBuildMessage() {
        return this.messages.length ? this.messages.join("\n") : null
    }

    prepareForCopy() {}

    getCopyPatterns() {
        return this.copyPatterns
    }

    generateBuildFiles() {}

    generateRepoFiles() {}
}

module.exports = {
    Hosting,
}