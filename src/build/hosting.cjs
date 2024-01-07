const { RESOURCE_LOADING, DEPLOY_METHOD } = require('./const.cjs')
const { d, csv2values } = require('../shared/helper.cjs')
const { bold } = require('../shared/console.cjs')

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

    constructor() {
        this.supports = this.getSupport()
        this.messages = []
    }

    addInstruction(msg) {
        this.messages.push(`  - ${msg}`)
    }

    getSupport() {
        return {
            nodejs: true,
            manualUpload: true,
            checkout: true,
            pwa: true
        }
    }

    get supportsNodejs() {
        return this.supports.nodejs
    }

    get supportsManualUpload() {
        return this.supports.manualUpload
    }

    get supportsCheckout() {
        return this.supports.checkout
    }

    prepare(config, fileDeps, isDist) {
        const { queue, absPath, syncFs } = fileDeps

        const deployMethod = config.deployMethod
        const server = config.server
        this.publicDir = absPath.dist(server ? 'public' : '')

        if (isDist) {
            const resourceDirs = ['json', 'image', 'audio', 'video']
            const staticTypes = csv2values(config.staticTypes)
            const isLocal = [RESOURCE_LOADING.LOCAL, RESOURCE_LOADING.LOCAL_ALL].includes(config.resourceLoading)

            for (const dir of resourceDirs) {
                const from = absPath.resources(dir)
                // if (syncFs.isEmptyDir(from)) continue

                if (isLocal && !staticTypes.includes(dir)) continue
                // copy the static resources directories to the public folder of the dist

                queue.addCopy(from, staticTypes.includes(dir) ? this.publicDir + '/' + dir : absPath.dist('resources', dir))
            }
            if ([RESOURCE_LOADING.API, RESOURCE_LOADING.API_ALL].includes(config.resourceLoading)) {
                // TODO: get rid of hardcoded files
                // api loading still requires the core files
                for (const file of ['scope2ids.json', 'id2children.json']) {
                    const from = absPath.resources(file)
                    if (!syncFs.fileExists(from)) continue
                    queue.addCopy(from, absPath.dist('resources', file))
                }
            }
            if (deployMethod === DEPLOY_METHOD.UPLOAD_PUBLIC) {
                this.addInstruction(`Upload the content of "${absPath.dist()}" to the public folder of your http web-server`)
            }
            if (server && [DEPLOY_METHOD.UPLOAD_ROOT, DEPLOY_METHOD.CHECKOUT].includes(deployMethod)) {
                const distPackageJsonPath = absPath.tmp('package.json')
                queue.addWriteJson(distPackageJsonPath, {
                        name: 'game',
                        version: '1.0.0',
                        scripts: {
                            start: 'node server.cjs'
                        },
                        dependencies: {
                            express: '^4.18.2'
                        }
                    }
                )
                queue.addCopy(distPackageJsonPath, absPath.dist('package.json'))
                if (deployMethod === DEPLOY_METHOD.UPLOAD_ROOT) {
                    this.addInstruction(`Upload the content of "${absPath.dist()}" to the document root folder of your http web-server`)
                    this.addInstruction(`Afterwards execute "npm install" in this directory`)
                } else {
                    this.addInstruction(`Checkout your game repo on your web server manually or automatically`)
                    this.addInstruction(`Afterwards execute "${bold('npm start')}" in the root directory of your web server`)
                }
            }
            return
        }
        if (deployMethod === 'checkout') {
            this.generateRepoFiles(config, fileDeps, isDist)
        }
    }

    generateBuildFiles() {}

    generateRepoFiles(config, fileDeps, isDist) {}
}

module.exports = {
    Hosting
}