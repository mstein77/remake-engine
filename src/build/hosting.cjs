const { RESOURCE_LOADING, DEPLOYMENT_METHOD } = require('./config.cjs')
const { d, csv2values } = require('../shared/helper.cjs')
const { bold } = require('../shared/console.cjs')
const { TASK, Tasks } = require("./target.cjs");

/**
 * A class representing the hosting of the game. Depending on the hoster certain features and deploy methods may be
 * available. The hosting is prepared by this class by copying resource files and adding files which are required
 * by the hoster. The class will also store instructions which should be followed by the user after the build to
 * deploy and start the game and a server.
 */
class Hosting {

    /**
     * Creates a new hosting instance
     *
     */
    constructor(distTarget, contents, fileDeps) {
        this.distTarget = distTarget
        this.contents = contents
        this.fileDeps = fileDeps
        this.setFlags()
    }

    /**
     * Sets the following flags on this:
     *  - supportsNodeJs
     *  - supportsManualUpload
     *  - supportsCheckout
     */
    setFlags() {
        throw Error('Implement me')
    }

    /**
     * Returns either a boolean indicating whether this hosting supports the given deployment method or a string holding
     * the deployment method which should be used because the given method is not supported.
     *
     * @param {string} value
     *
     * @returns {boolean|string}
     */
    supportsDeploymentMethod(value) {
        switch (value) {
            case DEPLOYMENT_METHOD.UPLOAD_ROOT:
            case DEPLOYMENT_METHOD.UPLOAD_PUBLIC:
                return this.supportsManualUpload

            case DEPLOYMENT_METHOD.CHECKOUT:
                return this.supportsCheckout
        }
        return true
    }

    /**
     * Generates files which should be added to the game repository
     *
     * @param {Tasks} tasks
     */
    generateRepoFiles() {}

    /**
     * Prepares the hosting in the development mode. Although there is no hosting required in the development mode
     * because it's all handled by the webpack dev-server, it can be used to generate repository files which are
     * required for the hosting
     */
    prepareDev() {
        const { config } = this.distTarget

        // TODO: only generate to game repo if deploymentMethod is checkout? Upload root may also need this in dist folder
        this.generateRepoFiles(config)
    }

    /**
     * Prepares the hosting in the dist folder and also adds instructions for the user to deploy the game and server
     */
    prepareDist() {
        const { config } = this.distTarget
        const { gamePackageJson } = this.contents
        const { queue, absPath, syncFs } = this.fileDeps

        const deploymentMethod = config.deploymentMethod
        const server = config.server

        const resourceDirs = ['json', 'image', 'audio', 'video']
        const staticTypes = csv2values(config.staticTypes)
        const isLocal = [RESOURCE_LOADING.LOCAL, RESOURCE_LOADING.LOCAL_ALL].includes(config.resourceLoading)

        for (const dir of resourceDirs) {
            const from = absPath.resources(dir)
            // if (syncFs.isEmptyDir(from)) continue

            if (isLocal && !staticTypes.includes(dir)) continue
            // copy the static resources directories to the public folder of the dist

            queue.addCopy(from, staticTypes.includes(dir) ? this.publicPath + '/' + dir : absPath.dist('resources', dir))
        }
        if ([RESOURCE_LOADING.API, RESOURCE_LOADING.API_ALL].includes(config.resourceLoading)) {
            const files = syncFs.readFiles(absPath.resources())
            for (const file of files) {
                if (!file.endsWith('.json')) continue

                queue.addCopy(absPath.resources(file), absPath.dist('resources', file))
            }
        }
        if (server && [DEPLOYMENT_METHOD.UPLOAD_ROOT, DEPLOYMENT_METHOD.CHECKOUT].includes(deploymentMethod)) {
            const distPackageJsonPath = absPath.tmp('package.json')
            syncFs.writeJson(distPackageJsonPath, {
                    name: gamePackageJson.name,
                    version: gamePackageJson.version,
                    scripts: {
                        start: 'node server.cjs',
                        preview: 'node server.cjs --preview'
                    },
                    dependencies: {}
                }
            )
            queue.addCopy(distPackageJsonPath, absPath.dist('package.json'))
        }
    }

    /**
     * Adds all necessary instructions for the user to deploy and start the server
     */
    addDeploymentInstructions() {
        const distTarget = this.distTarget
        const { config } = distTarget
        const { absPath } = this.fileDeps
        const { server, deploymentMethod } = config

        if (deploymentMethod === DEPLOYMENT_METHOD.UPLOAD_PUBLIC) {
            distTarget.addTaskMessage(
                TASK.SOURCE_TO_SERVER,
                `Upload the content of "${absPath.dist()}" to the public folder of your http web-server`
            )
        }
        if (!server) return

        if (deploymentMethod === DEPLOYMENT_METHOD.UPLOAD_ROOT) {
            distTarget
                .addTaskMessage(
                    TASK.SOURCE_TO_SERVER,
                    `Upload the content of "${absPath.dist()}" to the document root folder of your http web-server`
                )
                .addTaskMessage(
                    TASK.TRIGGER_INSTALL,
                    `Afterwards execute "npm install" in this directory`
                )
        }
        if (deploymentMethod === DEPLOYMENT_METHOD.CHECKOUT) {
            distTarget
                .addTaskMessage(
                    TASK.SOURCE_TO_SERVER,
                    `Checkout your game repo on your web server manually or automatically`
                )
                .addTaskMessage(
                    TASK.TRIGGER_START,
                    `Afterwards execute "${bold('npm start')}" in the root directory of your web server`
                )
        }
    }

    /**
     * Prepares the distribution for the hosting and adds instructions for the user to deploy the game deliverable and
     * start the server
     *
     * @param {boolean} isDist
     */
    prepare(isDist) {
        const { absPath } = this.fileDeps
        const { config } = this.distTarget
        const publicDir = config.server ? 'public' : ''
        this.distTarget.publicDir = publicDir
        this.publicPath = absPath.dist(publicDir)

        if (isDist) {
            this.prepareDist()
            this.addDeploymentInstructions()
        } else {
            this.prepareDev()
        }
    }
}

module.exports = {
    Hosting
}