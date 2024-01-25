const { d, stringList, toPairs, isVersionEqualOrHigher } = require('../shared/helper.cjs')
const { exec } = require('./helper.cjs')

/**
 * A class used to build a deliverable of a certain type. Depending on the deliverable this could mean that for instance
 * a compilation step is required to build an executable for the target system. Such a step could require special
 * programs and might only run on certain platforms, that's why this class allows to specify such requirements besides
 * implementing the actual compile and cleanup process
 */
class Deliverable {

    /**
     * Constructs a new deliverable
     */
    constructor() {
        this.supports = this.getSupport()
    }

    /**
     * Returns an object mapping features to a value indicating whether it is supported or not
     *
     * @returns {object}
     */
    getSupport() {
        return {
            hasCompiler: false,
            isAllInOne: true
        }
    }

    /**
     * Returns whether this deliverable requires a webpack build which is only single html file with all resources,
     * styles and scripts inside or not
     *
     * @returns {boolean}
     */
    get isAllInOne() {
        return this.supports.isAllInOne
    }

    /**
     * Returns whether this deliverable requires a compilation or not
     *
     * @returns {boolean|*}
     */
    get hasCompiler() {
        return this.supports.hasCompiler
    }

    /**
     * Returns a string which holds an error if a required platform, program or its version is missing, otherwise
     * undefined is returned
     *
     * @returns {string|undefined}
     */
    getMissingRequirements() {
        const requiredPlatforms = this.getRequiredPlatforms()
        const platform = process.platform
        if (requiredPlatforms.length && !requiredPlatforms.includes(platform))
            return `Build was triggered on platform "${platform}" but requires ${stringList(requiredPlatforms)}`

        const which = platform === 'win32' ? 'where' : 'which'
        const requiredPrograms = this.getRequiredPrograms()
        for (const [ program, minVersion ] of toPairs(requiredPrograms)) {
            {
                const { failed } = exec(`${which} ${program}`)
                if (failed)
                    return `Build requires "${program}" but could not be found`
            }
            if (minVersion === '*') continue
            {
                const { failed, output } = exec(`${program} -version`)
                if (failed) continue

                const versionRegExp = /(?:version:|v|version)\s*([0-9]+\.[0-9]+\.[0-9]+)/i
                const match = output.match(versionRegExp)
                if (!match) continue

                const programVersion = match[1]
                if (!isVersionEqualOrHigher(programVersion, minVersion))
                    return `Build requires version ${minVersion} of ${program} but found ${programVersion}`
            }
        }
    }

    /**
     * Returns either an empty array if the deliverable can be built on all platforms or a list of required platforms
     *
     * @returns {array}
     */
    getRequiredPlatforms() {
        return []
    }

    /**
     * Returns an object mapping required programs to the required minimum version or to '*' allow every version
     *
     * @returns {object}
     */
    getRequiredPrograms() {
        return {}
    }

    /**
     * Returns either a boolean indicating whether the given resource loading is allowed or a string which should be
     * used as resource loading because the given one is not allowed
     *
     * @param {string} value
     *
     * @returns {string|boolean}
     */
    supportsResourceLoading(value) {
        return true
    }

    /**
     * Prepares the webpack build in the given distTarget for the compilation process
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    prepareCompile(distTarget, configs, fileDeps) {}

    /**
     * Compiles the prepared build files in the given distTarget
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    compile(distTarget, configs, fileDeps) {}

    /**
     * Runs the post build processing which is executed after webpack build and compilation
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    processPostBuild(distTarget, configs, fileDeps) {}
}

module.exports = Deliverable