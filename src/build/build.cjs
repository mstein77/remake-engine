const absPath = require("../shared/absPath.cjs")
const syncFs = require("../shared/syncFs.cjs")
const { d, isArray, toPairs, simpleType, isObject, isVersionEqualOrHigher } = require("../shared/helper.cjs")
const { getBuildLogLevel, subSectionWarning, dumpJson,
    bold, log, errorSection, setBuildLogLevel, mainSection,
    hasLogLevel, newLine, subSection, subSectionOk, subSectionError} = require("../shared/console.cjs")
const { FileOpQueue } = require("./fileOps.cjs")
const { buildConfig, runConfigIntegrityChecks, DEPLOYMENT_METHOD} = require("./config.cjs")
const { getDefaultFromModule, getJsonObjectFromFile, id2name } = require("./helper.cjs")
const { getTargetWebpackConfigs } = require("./webpack.cjs")
const { ResourceTypeRegistry } = require("../shared/resources.cjs")
const PostBuildPlugin = require("./plugins/PostBuildPlugin.cjs")

const minNodeVersion = 'v16'
const BUILD_TEMP_DIR = '.dist'

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
    const { gamePackageJson } = configs
    const { isDist, info } = options
    const buildsJson = configs.buildsJson
    let distTargets = []
    const { absPath, queue } = fileDeps
    queue.addClear(absPath.tmp(), true)
    if (buildsJson) {
        queue.addPath(absPath.dists())
        for (const [ target, overwrites ] of toPairs(buildsJson)) {
            distTargets.push({ target, root: absPath.dists(), dir: target, tmpDir: BUILD_TEMP_DIR + '-' + target, overwrites, skip: false })
        }
    } else {
        if (isDist) queue.addPath(absPath.dist())
        distTargets.push({overwrites: {}, root: absPath.game(), dir: 'dist', tmpDir: BUILD_TEMP_DIR, skip: false})
    }
    const gameId = gamePackageJson.name
    configs.metaVars = {
        'game.id': gameId,
        'game.name': gamePackageJson.displayName || id2name(gameId),
        'game.version': gamePackageJson.version,
        'game.buildtime': Date.now(),
        'game.author': gamePackageJson.author,
        'game.description': gamePackageJson.description,
        'game.keywords': gamePackageJson.keywords.join(',')
    }

    mainSection(`Generate webpack configs...`, 'BUILD')

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
        const { root, tmpDir, target, overwrites } = distTarget

        hasLogLevel('normal') && log(
            target ? `Build "${bold(target)}":\n` : `Starting ${bold(isDist ? 'dist' : 'dev')} build:\n`
        )
        queue.clear()
        const path = absPath.make(root, tmpDir)
        queue.addClear(path, true).process()
        absPath.setCurrDist(path)

        subSection('Validating build config')
        const rawConfig = buildConfig(configs.configJson, process.env, overwrites, isDist)
        subSectionOk()

        subSection('Checking integrity of config')
        const { config, warnings, deliverable, hosting } = runConfigIntegrityChecks(rawConfig, fileDeps, isDist)
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

        subSection(`Checking build requirements`)
        const missing = deliverable.getMissingRequirements(fileDeps)
        if (missing) {
            if (target) {
                subSectionError(missing)
                distTarget.skip = true
                continue
            }
            throw Error(missing)
        }
        subSectionOk()

        subSection(`Prepare hosting for ${bold(config.hosting)}`)
        distTarget.publicDir = hosting.prepare(distTarget, configs, fileDeps, isDist)
        subSectionOk()

        subSection(`Add application assets`)
        deliverable.prepareAppAssets(distTarget, configs, fileDeps)
        subSectionOk()

        subSection(`Generate webpack config`)
        configs.config = config
        const webpackConfigs = getTargetWebpackConfigs(configs, fileDeps, deliverable, hosting, { isDist, target, info, distTarget })

        subSectionOk()
        lastEngineConfig = webpackConfigs[0]

        subSection(`Prepare files in dist folder ${bold(absPath.dist())} `)
        queue.process()
        subSectionOk('\n')

        if (hasLogLevel('normal') && hosting.instructions) {
            distTarget.instructions = [ ...hosting.instructions ]
        }
        resultConfigs.push( ...webpackConfigs )
        while (buildConfigs.length < resultConfigs.length) buildConfigs.push(config)
    }
    distTargets = distTargets.filter(item => !item.skip)
    if (!distTargets.length)
        throw Error('No build is fulfilling the requirements. Aborting...')

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
            buildLogLevel: getBuildLogLevel(),
            configs
        }
        lastEngineConfig.plugins.push(
            new PostBuildPlugin(params)
        )
    }
    let result = resultConfigs.length === 1 ? resultConfigs[0] : resultConfigs

    mainSection(`Execute webpack configs...`, 'BUILD')

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
    log(`  Please follow these instructions:`)
    newLine()
    for (const line of instructions) {
        log(`  - ${line}`)
    }
    newLine()
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
        errorSection(e, 'BUILD')
    }
}

/**
 * Runs the post build processing for the given dist targets and build log level
 *
 * @param {array} distTargets
 * @param {string} buildLogLevel
 * @param {object} configs
 */
const runPostBuildProcessing = async ({ distTargets, buildLogLevel, configs }) => {

    setBuildLogLevel(buildLogLevel)
    mainSection('Post build processing...', 'BUILD')

    const postBuildHook = getBuildHook('post-build')
    const queue = new FileOpQueue()
    const fileDeps = {
        absPath,
        syncFs,
        queue
    }

    const exceptDirs = []
    let index = 0
    for (const distTarget of distTargets) {
        let { target, config, root, dir, tmpDir } = distTarget
        const path = absPath.make(root, tmpDir)
        absPath.setCurrDist(path)

        if (target) {
            exceptDirs.push(dir)
            hasLogLevel('normal') && log(`Build "${bold(target)}":\n`)
        } else {
            target = 'dist build'
        }
        const Deliverable = require(`./deliverables/${config.deliverable}.cjs`)
        const deliverable = new Deliverable(config.deliverableConfig)

        const params = [ distTarget, { ...configs, config }, fileDeps ]

        subSection(`Generate assets`)
        await deliverable.generateAssets( ...params )
        subSectionOk()

        if (deliverable.hasCompiler) {
            subSection(`Prepare compilation`)
            await deliverable.prepareCompile( ...params )
            subSectionOk()

            let skipCompile = false
            const compileHook = getBuildHook('compile')
            if (compileHook) {
                subSection(`Trigger compile-hook`)
                skipCompile = compileHook( ...params )
                subSectionOk()
            }
            if (!skipCompile) {
                subSection(`Execute compiler`)
                await deliverable.compile( ...params )
                subSectionOk()
            }
        }
        subSection(`Run post build processing`)
        deliverable.processPostBuild( ...params )
        subSectionOk()

        if (postBuildHook) {
            subSection(`Trigger post-build-hook`)
            postBuildHook( ...params )
            subSectionOk()
        }
        queue.addReplace(path, absPath.make(root, dir)).process()

        index++
        if (index !== distTargets.length) newLine()
    }
    if (exceptDirs.length) {
        queue.addClear(absPath.dists(), false, exceptDirs).process()
    }

    mainSection('Build successfully finished...', 'BUILD')

    for (const { target, instructions, root, dir } of distTargets) {
        if (!hasLogLevel('normal') || !instructions) continue

        if (target) {
            log(`Build ${bold(target)} in ${bold(absPath.make(root, dir))}:`)
            newLine()
            showInstructions(instructions)
        } else {
            showInstructions(instructions)
        }
    }
}

module.exports = {
    runPostBuildProcessing,
    generateWebpackConfigs
}