const absPath = require("../shared/absPath.cjs")
const syncFs = require("../shared/syncFs.cjs")
const { d, isArray, toPairs, simpleType, isObject, isVersionEqualOrHigher } = require("../shared/helper.cjs")
const {
    getBuildLogLevel, subSectionWarning, dumpJson,
    bold, colorLog, errorSection, setBuildLogLevel, mainSection, hasLogLevel, newLine, subSection, subSectionOk} = require("../shared/console.cjs")
const { FileOpQueue } = require("./fileOps.cjs")
const { buildConfig, applyConfigIntegrityChecks } = require("./config.cjs")
const { getDefaultFromModule, getJsonObjectFromFile } = require("./helper.cjs")
const { getTargetWebpackConfigs } = require("./webpack.cjs")
const PostBuildPlugin = require("./plugins/PostBuildPlugin.cjs")
const { ResourceTypeRegistry } = require("../shared/resources.cjs")
const minNodeVersion = 'v16'

/**
 * Returns the function for the build hook with the given name if its available otherwise undefined
 *
 * @param {string} name
 *
 * @returns {function}
 */
const getBuildHook = name => getDefaultFromModule(absPath.game(name + '-hook.cjs'), 'function', false)

/**
 * Runs the generation of all webpack configs which are necessary for dev or production build according to the given
 * build config and returns them either as array or object. If a buildsJson is given in the configs parameter then all
 * webpack configs described in the json will be generated instead.
 *
 * @param {object} configs
 * @param {object} fileDeps
 * @param {boolean} options
 *
 * @returns {object|array}
 */
const runWebpackConfigGeneration = (configs, fileDeps, options) => {

    const { isDist, info } = options
    const buildsJson = configs.buildsJson
    const distTargets = []
    const { absPath, queue } = fileDeps
    queue.addClear(absPath.tmp(), true)
    if (buildsJson) {
        queue.addClear(absPath.dists(), true)
        for (const [ target, overwrites ] of toPairs(buildsJson)) {
            distTargets.push({ target, path: absPath.dists(target), overwrites })
        }
    } else {
        if (isDist) queue.addClear(absPath.dist(), true)
        distTargets.push({overwrites: {}})
    }

    mainSection(`1. Generate webpack configs...`)

    queue.process()
    let lastEngineConfig = null
    let resultConfigs = []
    const buildConfigs = []

    const ResourceTypesHook = getBuildHook('resource-types')
    if (ResourceTypesHook) {
        subSection('Passing ResourceTypeRegistry to resource-types-hook')
        ResourceTypesHook(ResourceTypeRegistry)
        subSectionOk()
        newLine()
    }

    for (const distTarget of distTargets) {
        const { target, path, overwrites } = distTarget

        queue.clear()
        if (path) absPath.setCurrDist(path)

        hasLogLevel('normal') && colorLog(
            target ? `Build "${bold(target)}":\n` : `Starting ${bold(isDist ? 'dist' : 'dev')} build:\n`
        )

        subSection('Validating build config')
        const rawConfig = buildConfig(configs.configJson, process.env, overwrites, isDist)
        subSectionOk()

        subSection('Checking integrity of config')
        const Hosting = require(`./hostings/${rawConfig.hosting}.cjs`)
        const hosting = new Hosting()
        const { config, warnings } = applyConfigIntegrityChecks(rawConfig, hosting, isDist)
        if (warnings.length) {
            while (warnings.length) {
                subSectionWarning(warnings.pop())
            }
        } else {
            subSectionOk()
        }
        distTarget.config = config

        if (hasLogLevel('detailed')) {
            subSection('Result config')
            dumpJson(config, 4)
        }

        subSection(`Prepare hosting for ${bold(config.hosting)}`)
        hosting.prepare(config, fileDeps, isDist)
        subSectionOk()

        subSection(`Generate webpack config`)
        configs.config = config
        const webpackConfigs = getTargetWebpackConfigs(configs, fileDeps, hosting, { isDist, target, info })

        subSectionOk()
        lastEngineConfig = webpackConfigs[0]

        subSection(`Prepare files in dist folder ${bold(absPath.dist())} `)
        queue.process()
        subSectionOk('\n')

        if (hasLogLevel('normal') && hosting.messages) {
            distTarget.instructions = [ ...hosting.messages ]
        }
        resultConfigs.push( ...webpackConfigs )
        while (buildConfigs.length < resultConfigs.length) buildConfigs.push(config)
    }

    const webpackHook = getBuildHook('webpack')
    if (webpackHook) {
        subSection('Passing all generated webpack configs to webpack hook')
        resultConfigs = webpackHook(resultConfigs, buildConfigs, options)
        if (!isArray(resultConfigs))
            throw Error(`Webpack hook result must be of type array but got ${simpleType(resultConfigs)}`)

        subSectionOk()
    }
    if (!info && isDist) {
        const params = {
            distTargets,
            buildLogLevel: getBuildLogLevel()
        }
        lastEngineConfig.plugins.push(
            new PostBuildPlugin(params)
        )
    }
    let result = resultConfigs.length === 1 ? resultConfigs[0] : resultConfigs

    mainSection(`2. Execute webpack configs...`)

    if (hasLogLevel('detailed')) {
        subSection('Generated webpack config')
        dumpJson(result, 4)
        newLine()
        subSection('Starting webpack')
        newLine()
    }
    return result
}

/**
 * Writes the given instructions in a new instruction block on the console
 *
 * @param {array} instructions
 */
const showInstructions = instructions => {
    colorLog(`  Please follow these instructions:`)
    newLine()

    for (const line of instructions) {
        colorLog(line)
    }
    newLine()
}
/**
 * Runs the post build processing for the given dist targets and build log level
 *
 * @param {array} distTargets
 * @param {string} buildLogLevel
 */
const runPostBuildProcessing = ({ distTargets, buildLogLevel }) => {

    setBuildLogLevel(buildLogLevel)

    mainSection('3. Post build processing...')

    const postBuildHook = getBuildHook('post-build')
    if (postBuildHook) {
        for (const distTarget of distTargets) {
            const { target = 'dist build' } = distTarget
            subSection(`Trigger post-build-hook for ${bold(target)}`)
            postBuildHook(distTarget)
            subSectionOk()
        }
    }

    mainSection('4. Build successfully finished...')

    for (const { target, instructions, path } of distTargets) {
        if (!hasLogLevel('normal') || !instructions) continue

        if (target) {
            colorLog(`Build ${bold(target)} in ${bold(path)}:`)
            newLine()
            showInstructions(instructions)
        } else {
            showInstructions(instructions)
        }
    }
}

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
    runPostBuildProcessing,
    generateWebpackConfigs
}