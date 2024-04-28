const absPath = require("../shared/absPath.cjs")
const syncFs = require("../shared/syncFs.cjs")
const { d, isArray, toPairs, simpleType, isObject } = require("../shared/helper.cjs")
const { getBuildLogLevel, subSectionWarning, dumpJson, bold, log, errorSection, setBuildLogLevel, mainSection,
    hasLogLevel, newLine, subSection, subSectionOk, subSectionError, extractOptionsAndArguments, NoStackError, asyncSubSection
} = require("../shared/console.cjs")
const { Tasks } = require("./tasks.cjs")
const { FileOpQueue } = require("./queue.cjs")
const { buildConfig, runConfigIntegrityChecks } = require("./config.cjs")
const { getDefaultFromModule, getJsonObjectFromFile, id2name, argInfoGame } = require("./helper.cjs")
const { getTargetWebpackConfigs } = require("./webpack.cjs")
const { ResourceTypeRegistry } = require("../shared/resources.cjs")
const PostBuildPlugin = require("./plugins/PostBuildPlugin.cjs")

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
 * @param {object} contents
 * @param {object} fileDeps
 * @param {object} options
 *
 * @returns {object|array}
 */
const runWebpackConfigGeneration = (contents, fileDeps, options) => {
    const { gamePackageJson, buildJson, buildsJson } = contents
    const { isDist, info } = options
    let distTargets = []
    const { absPath, queue } = fileDeps
    queue.addClear(absPath.tmp(), true)
    if (buildsJson) {
        queue.addPath(absPath.dists())
        for (const [ target, overwrites ] of toPairs(buildsJson)) {
            distTargets.push({
                target, root: absPath.dists(), dir: target, tmpDir: BUILD_TEMP_DIR + '-' + target, overwrites, skip: false
            })
        }
    } else {
        if (isDist) queue.addPath(absPath.dist())
        distTargets.push({
            overwrites: {}, root: absPath.game(), dir: 'dist', tmpDir: BUILD_TEMP_DIR, skip: false
        })
    }
    const gameId = gamePackageJson.name
    contents.metaVars = {
        'game.id': gameId,
        'game.name': gamePackageJson.displayName || id2name(gameId),
        'game.version': gamePackageJson.version,
        'game.buildtime': Date.now(),
        'game.author': gamePackageJson.author,
        'game.description': gamePackageJson.description,
        'game.keywords': gamePackageJson.keywords.join(',')
    }

    mainSection(`Generate webpack configs...`)

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
        const rawConfig = buildConfig(buildJson, process.env, overwrites, isDist)
        subSectionOk()

        subSection('Checking integrity of config')
        const { config, warnings, deliverable, hosting } = runConfigIntegrityChecks(rawConfig, distTarget, contents, fileDeps, options)
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
        const missing = deliverable.getMissingRequirements()
        if (missing) {
            if (target) {
                subSectionError(missing)
                distTarget.skip = true
                continue
            }
            throw NoStackError(missing)
        }
        subSectionOk()

        subSection(`Prepare hosting for ${bold(config.hosting)}`)
        const { tasks } = hosting.prepare(isDist)
        subSectionOk()

        subSection(`Add application assets`)
        deliverable.prepareAppAssets()
        subSectionOk()

        subSection(`Generate webpack config`)
        const webpackConfigs = getTargetWebpackConfigs(contents, fileDeps, deliverable, hosting, { isDist, target, info, distTarget })

        subSectionOk()
        lastEngineConfig = webpackConfigs[0]

        subSection(`Prepare files in dist folder ${bold(absPath.dist())} `)
        queue.process()
        subSectionOk('\n')

        if (hasLogLevel('normal')) {
            distTarget.instructions = tasks.toJson()
        }
        resultConfigs.push( ...webpackConfigs )
        while (buildConfigs.length < resultConfigs.length) buildConfigs.push(config)
    }
    distTargets = distTargets.filter(item => !item.skip)
    if (!distTargets.length)
        throw NoStackError('No build is fulfilling the requirements. Aborting...')

    const webpackHook = getBuildHook('webpack')
    if (webpackHook) {
        subSection('Passing all generated webpack configs to webpack hook')
        resultConfigs = webpackHook(resultConfigs, buildConfigs, options)
        if (!isArray(resultConfigs))
            throw NoStackError(`Webpack hook result must be of type array but got ${simpleType(resultConfigs)}`)

        subSectionOk()
    }
    if (!info && isDist) {
        const params = {
            distTargets,
            buildLogLevel: getBuildLogLevel(),
            contents
        }
        lastEngineConfig.plugins.push(
            new PostBuildPlugin(params)
        )
    }
    let result = resultConfigs.length === 1 ? resultConfigs[0] : resultConfigs

    mainSection(`Execute webpack configs...`)

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
    const tasks = new Tasks(instructions)
    const lines = tasks.getFlat()
    if (!lines.length) return

    log(`  Please follow these instructions:`)
    newLine()
    for (const line of lines) {
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
 *
 * @returns {array|object}
 */
const generateWebpackConfigs = (isDist, all = false) => {
  try {
        const { options, args } = extractOptionsAndArguments(argInfoGame)

        const target = isDist && args.length ? args[0] : null
        const info = options.info === true

        const buildJson = getDefaultFromModule(absPath.game('build.cjs'))
        let buildLogLevel = buildJson.buildLogging
        if (options.quiet) {
            buildLogLevel = 'none'
        } else if (options.minimal) {
            buildLogLevel = 'minimal'
        } else if (options.normal) {
            buildLogLevel = 'normal'
        } else if (options.detailed) {
            buildLogLevel = 'detailed'
        } else if (options.verbose) {
            buildLogLevel = 'verbose'
        }
        if (buildLogLevel) setBuildLogLevel(buildLogLevel)

        const fileDeps = {
            absPath,
            queue: new FileOpQueue(),
            syncFs
        }
        const enginePackageJson = getJsonObjectFromFile(absPath.engine('package.json'))
        const contents = {
            buildJson,
            enginePackageJson,
            gamePackageJson: getJsonObjectFromFile(absPath.game('package.json'))
        }
        process.env.RMK_ENGINE_VERSION = enginePackageJson.version
        if (isDist && (all || target)) {
            const buildsPath = absPath.game('builds.cjs')
            contents.buildsJson = getDefaultFromModule(buildsPath)
            const pairs = toPairs(contents.buildsJson)
            const matchRegExp = new RegExp('^[a-z1-9\-\_]+$', 'i')
            for (const [ key, value ] of pairs) {
                if (!key.match(matchRegExp))
                    throw NoStackError(`Invalid build name "${key}" in ${buildsPath}. Must match RegExp ${matchRegExp.toString()}`)

                if (!isObject(value))
                    throw NoStackError(`Value of key "${key}" in ${buildsPath}. Must be an object but got ${simpleType(value)}`)
            }
            if (target) {
                const def = contents.buildsJson[target]
                if (!def)
                    throw NoStackError(`Build target "${target}" no found in builds.cjs`)

                contents.buildsJson = { [target]: def }
            }
        }
        return runWebpackConfigGeneration(contents, fileDeps,{ isDist, info, all: options.all })

    } catch (e) {
        errorSection(e)
    }
}

/**
 * Runs the post build processing for the given dist targets and build log level
 *
 * @param {array} distTargets
 * @param {string} buildLogLevel
 * @param {object} contents
 */
const runPostBuildProcessing = async ({ distTargets, buildLogLevel, contents }) => {

    setBuildLogLevel(buildLogLevel)
    mainSection('Post build processing...')

    const { enginePackageJson } = contents
    process.env.RMK_ENGINE_VERSION = enginePackageJson.version
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
        }
        const Deliverable = require(`./deliverables/${config.deliverable}.cjs`)
        const deliverable = new Deliverable(config.deliverableConfig, distTarget, contents, fileDeps)
        const params = []

        await asyncSubSection(
            `Generate assets`,
            [deliverable, 'generateAssets'],
             ...params
        )

        if (deliverable.hasMakeStep) {
            absPath.setCurrArtifact(absPath.artifacts(target ? 'dists/' + target : 'dist'))
            queue.addPath(absPath.artifactsIn(), true)

            await asyncSubSection(
                `Prepare make`,
                [deliverable, 'prepareMake'],
                ...params
            )
            queue.addPath(absPath.artifactsOut(), true)
            let skipMake = false
            const makeHook = getBuildHook('make')
            if (makeHook) {
                skipMake = await asyncSubSection(
                    `Trigger make-hook`,
                    makeHook,
                    params
                )
            }
            if (!skipMake) {
                await asyncSubSection(
                `Execute make`,
                    [deliverable, 'make'],
                    ...params
                )
                await asyncSubSection(
                    `Publish make results`,
                    [deliverable, 'finishMake'],
                    ...params
                )
            }
            if (!config.keepArtifacts) {
                queue.addClear(absPath.artifacts())
                await queue.processAsync()
            }
        }
        await asyncSubSection(
            `Run post build processing`,
            [deliverable, 'processPostBuild'],
            ...params
        )

        const postBuildHook = getBuildHook('post-build')
        if (postBuildHook) {
            await asyncSubSection(
                `Trigger post-build-hook`,
                postBuildHook,
                ...params
            )
        }
        if (config.server && deliverable.hasMakeStep) {
            const pluginFileName = 'DownloadsPlugin.cjs'
            const gamePluginPath = absPath.game(pluginFileName)
            const pluginPath = syncFs.fileExists(gamePluginPath) ?
                gamePluginPath : absPath.src('build', 'plugins', pluginFileName)
            queue.addCopy(pluginPath, absPath.make(path, pluginFileName))
        }
        queue.addReplace(path, absPath.make(root, dir)).process()

        index++
        if (index !== distTargets.length) {
            newLine()
        } else if (!config.keepArtifacts) {
            queue.addDelete(absPath.artifacts())
        }
    }
    if (exceptDirs.length) {
        queue.addClear(absPath.dists(), false, exceptDirs)
    }
    queue.process()

    mainSection('Build successfully finished...')

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