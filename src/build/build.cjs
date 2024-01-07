const absPath = require("../shared/classes/absPath.cjs")
const syncFs = require("../shared/classes/syncFs.cjs")
const { runWebpackConfigGeneration } = require("./webpack.cjs")
const { d, isObject, simpleType, toPairs, isVersionEqualOrHigher} = require("../shared/classes/helper.cjs")
const { errorSection, setBuildLogLevel } = require("../shared/classes/console.cjs")
const { FileOpQueue } = require("./fileOps.cjs")
const { getDefaultFromModule, getJsonObjectFromFile } = require("./helper.cjs")

const minNodeVersion = 'v16'

/**
 * Generates the webpack configs which will build the game for the dev or production environment according to the
 * build config file and returns them either as array (if multiple are necessary) or an object.
 * If the all-flag is set a webpack config for each build configured in the builds.cjs file will be generated.
 * In case of a normal build the info flag can be set to open a bundle analyser in the browser at the end of the build
 *
 * @param {boolean} isDist
 * @param {boolean} all
 * @param {boolean} info
 *
 * @returns {array|object}
 */
const generateWebpackConfigs = (isDist, all = false, info = false) => {
    try {
        if (!isVersionEqualOrHigher(process.version, minNodeVersion))
            throw Error(`Your node version is ${process.version} but ${minNodeVersion} or above is required `)

        const configJson = getDefaultFromModule(absPath.game('config.cjs'))
        const buildLogLevel = configJson.buildLogging
        if (buildLogLevel) setBuildLogLevel(buildLogLevel)

        const fileDeps = {
            absPath,
            queue: new FileOpQueue(),
            syncFs
        }
        const configs = {
            configJson,
            enginePackageJson: getJsonObjectFromFile(absPath.engine('package.json')),
            gamePackageJson: getJsonObjectFromFile(absPath.game('package.json'))
        }
        if (isDist && all) {
            const buildsPath = absPath.game('builds.cjs')
            configs.buildsJson = getDefaultFromModule(buildsPath)
            const pairs = toPairs(configs.buildsJson)
            const matchRegExp = new RegExp('^[a-z1-9\-\_]+$', 'i')
            for (const [ key, value ] of pairs) {
                if (!key.match(matchRegExp))
                    throw Error(`Invalid build name "${key}" in ${buildsPath}. Must match RegExp ${matchRegExp.toString()}`)

                if (!isObject(value))
                    throw Error(`Value of key "${key}" in ${buildsPath}. Must be an object but got ${simpleType(value)}`)
            }
        }
        return runWebpackConfigGeneration(configs, fileDeps,{ isDist, info })

    } catch (e) {
        errorSection(e)
    }
}

module.exports = {
    generateWebpackConfigs
}