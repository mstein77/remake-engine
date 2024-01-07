const setupAppMiddlewares = require("../server/setupMiddlewares.cjs")
const { DefinePlugin, NormalModuleReplacementPlugin} = require("webpack")
const { RESOURCE_LOADING} = require("./const.cjs")
const { makeDescriptor} = require("../shared/classes/resources.cjs")
const { FileCodec} = require("../shared/classes/fileCodec.cjs")
const { d, isArray, csv2values, trim, toPairs, simpleType } = require("../shared/classes/helper.cjs")
const { newLine, subSectionWarning, mainSection, subSectionOk, subSection, dumpJson, bold, colorLog, hasLogLevel } = require("../shared/classes/console.cjs")
const { buildConfig, applyConfigIntegrityChecks } = require("./config.cjs")
const { stringifyValues, getDefaultFromModule } = require("./helper.cjs")
const { FILE_OP } = require('./fileOps.cjs')

const HtmlWebpackPlugin = require("html-webpack-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ESLintPlugin = require("eslint-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const PostBuildMessagePlugin = require("./plugins/PostBuildMessagePlugin.cjs")
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

/**
 * Returns an array holding all webpack configs for building the dist target with the given hosting, configs
 * and options
 *
 * @param {object} configs
 * @param {object} fileDeps
 * @param {Hosting} hosting
 * @param {object} options
 *
 * @returns {array}
 */
const getTargetWebpackConfigs = (configs, fileDeps, hosting, options) => {

    const { target, info, isDist } = options
    const { config, enginePackageJson, gamePackageJson } = configs
    const { absPath, queue, syncFs } = fileDeps

    const targetPrefix = target ? target + '-' : ''
    FileCodec.init(absPath)

    const gameId = gamePackageJson.name
    const staticTypes = config.staticTypes
    const requiresApi =
        [RESOURCE_LOADING.API, RESOURCE_LOADING.API_ALL].includes(config.resourceLoading)
    const useServer = isDist && config.server

    const common = {
        mode: isDist ? 'production' : 'development',
        stats: {
            preset: config.buildLogging
        },
        performance: {
            hints: isDist ? 'warning' : false,
            assetFilter: file => file.endsWith('.js'),
            maxEntrypointSize: 250000
        }
    }

    const defines = {
        BASE_URL: (
            (config.https ? 'https' : 'http') + `://${config.host}${config.port !== 80 ? ':' + config.port : ''}` +
            `${config.path ? '/' + trim(config.path, '/') : ''}`
        ),
        VERSION_ENGINE: enginePackageJson.version,
        VERSION_GAME: gamePackageJson.version,
        GAME_ID: gameId,
        IS_DIST: isDist,
        STATIC_TYPES: staticTypes,
        RESOURCES_API: !isDist || requiresApi
    }

    /**
     * Returns an object holding the webpack config for building the game frontend
     *
     * @returns {object}
     */
    const getEngineWebpackConfig = () => {
        const webpackConfig = {}

        // add dev-server if we are in dev environment
        if (!isDist) {
            let open = false
            if (config.openBrowser) {
                if (config.openBrowser === 'default') {
                    open = true
                } else {
                    open = {
                        app: {
                            name: config.openBrowser
                        }
                    }
                }
            }
            webpackConfig.devServer = {
                client: {
                    progress: true,
                    overlay: true,
                    logging: config.clientLogging
                },
                open,
                compress: config.compress,
                setupMiddlewares: (middlewares, devServer) => {
                    if (!devServer)
                        throw new Error('webpack-dev-server is not defined!')

                    setupAppMiddlewares(devServer.app, { ...config, staticTypes: config.staticTypes, IS_DIST: false })

                    return middlewares
                },
                static: absPath.dist(config.server ? 'public' : ''),
                port: config.port
            }
        }

        const pubPrefix = config.server ? 'public' : ''

        const plugins = [
            new DefinePlugin(
                stringifyValues({
                    ...defines,
                    ...{
                        EDITOR_KEY: config.editorKey // TODO: remove
                    }
                })
            ),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                inject: 'body',
                title: config.title,
                meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
            })
        ]

        const entryParts = [absPath.game('src/index.js')]
        if (config.editor) {
            entryParts.push(absPath.src('engine/editor/index.js'))
        }
        const useStaticFetcher = isDist && !requiresApi
        if (useStaticFetcher) {
            // we are not loading from a server api, so only static or from a local cache file
            // the static api fetcher will first check the generated cache file and only fetch statically from the server
            // if the resource was not found
            const tids = []

            const cache = {}
            const staticTypes = csv2values(config.staticTypes)
            const resourceFiles = syncFs.readFilesRec(absPath.resources())
            for (const file of resourceFiles) {
                const descriptor = makeDescriptor.fromFile(file)
                if (!descriptor || !descriptor.isValid()) continue

                const tid = descriptor.extTid
                if (!descriptor.isCoreJson()) tids.push(tid)
                cache[tid] =
                    !descriptor.isCoreJson() && staticTypes.includes(descriptor.key) ? null : FileCodec.decode(descriptor)
            }
            queue.addWriteContent(
                absPath.tmp(targetPrefix + 'resources-info.js'),
                `const resourceInfo = ${JSON.stringify({ cache, tids }, null, 4)}
export default resourceInfo`
            )
            plugins.push(
                new NormalModuleReplacementPlugin(
                    /fetcher\/api/,
                    resource => {
                        resource.request = resource.request.replace(
                            /api/,
                            `static`
                        )
                    }
                )
            )
            if (targetPrefix) {
                plugins.push(
                    new NormalModuleReplacementPlugin(
                        /resources\-info/,
                        resource => {
                            resource.request = resource.request.replace(
                                /resources/,
                                targetPrefix + `resources`
                            )
                        }
                    )
                )
            }
        }
        if (true || isDist) {
            plugins.push(new CssMinimizerPlugin());
            plugins.push(new MiniCssExtractPlugin({filename: 'css/[name].[contenthash].css'}))
        }
        if (config.eslint) {
            plugins.push(
                new ESLintPlugin({
                    context: absPath.src(),
                    overrideConfigFile: absPath.game('.eslintrc.cjs')
                })
            )
        }
        if (info) {
            plugins.push(
                new BundleAnalyzerPlugin()
            )
        }
        const minimizer = [
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: /@license/i
                    }
                },
                extractComments: true
            })
        ]
        if (true || isDist) {
            minimizer.push(new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: [
                        "default",
                        {
                            discardComments: { removeAll: true },
                        },
                    ],
                },
            }))
        }
        const copyOps = queue.extract(FILE_OP.COPY)
        const patterns = []
        for (const { from , to } of copyOps) {
            if (syncFs.exists(from) && !syncFs.isEmptyDir(from)) patterns.push({ from, to })
        }
        if (patterns.length) {
            plugins.push(new CopyWebpackPlugin({
                patterns
            }))
        }
        const dependencies = useServer ? [targetPrefix + 'server'] : []

        return {
            ...common,
            name: targetPrefix + 'game',
            context: absPath.engine(),
            dependencies,
            devtool: config.sourceMaps && config.sourceMapType,
            entry: {
                game: entryParts
            },
            output: {
                path: absPath.dist(pubPrefix),
                clean: true,
                filename: 'js/[' + (isDist ? 'contenthash' : 'name') + '].js',
                publicPath: '/'
            },
            optimization: {
                minimize: config.minimize,
                minimizer,
                splitChunks: {
                    chunks: 'all',
                    minSize: 0,
                    cacheGroups: {
                        vendors: {
                            test: new RegExp(`/\\/${enginePackageJson.name}\\/node_modules\\//`),
                            reuseExistingChunk: true,
                            name(module, chunks, cacheGroupKey) {
                                const packageName = module.context.match(
                                    new RegExp(
                                        `/[\\/]${enginePackageJson.name}[\\/]node_modules[\\/](.*?)([\\/]|$)/`
                                    )
                                )[1]
                                return `${cacheGroupKey}.${packageName.replace("@", "")}`
                            },
                            filename: 'js/[' + (isDist ? 'contenthash' : 'name') + '].js'
                        },
                        common: {
                            minChunks: 2,
                            priority: -10,
                            filename: 'js/[' + (isDist ? 'contenthash' : 'name') + '].js'
                        }
                    }
                },
                runtimeChunk: "single"
            },
            module: {
                rules: [
                    {
                        test: /\.(js|jsx)$/,
                        exclude: `/${enginePackageJson.name}\\/node_modules/`,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                "presets": [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": [config.browsers]
                                            },
                                            "exclude": ["proposal-dynamic-import"]
                                        }
                                    ],
                                    "@babel/preset-react"
                                ]
                            }
                        }
                    },
                    {
                        test: /\.(css)$/,
                        use: [
                            true || isDist ? MiniCssExtractPlugin.loader : 'style-loader',
                            {loader: 'css-loader', options: {sourceMap: config.sourceMaps}}
                        ]
                    },
                    {
                        test: /\.(woff|woff2|eot|ttf|otf)$/i,
                        type: 'asset/resource',
                        generator: {
                            filename: 'css/[' + (isDist ? 'contenthash' : 'name') + '][ext]',
                        }
                    },
                    {
                        test: /\.m?js$/,
                        resolve: {
                            fullySpecified: false
                        }
                    }
                ]
            },
            plugins,
            resolve: {
                alias: {
                    helper: absPath.src('engine/helper') + '/',
                    editor: absPath.src('engine/editor') + '/',
                    core: absPath.src('engine/core') + '/',
                    panes: absPath.src('engine/panes') + '/',
                    plugins: absPath.src('engine/plugins') + '/',
                    shared: absPath.src('shared') + '/'
                },
                extensions: ['*', '.js', '.jsx']
            },
            ...webpackConfig
        }
    }

    /**
     * Returns an object holding the webpack config for building the server
     *
     * @returns {object}
     */
    const getServerWebpackConfig = () => {

        const port = config.port
        const plugins = [
            new DefinePlugin(
                stringifyValues({
                    ...defines,
                    ...{
                        PORT: port,
                        LOGGING: config.serverLogging,
                        LOGGING_FORMAT: config.serverLoggingFormat,
                        API_MAX_JSON_SIZE: config.apiMaxJsonSize
                    }
                })
            )
        ];
        return {
            ...common,
            name: targetPrefix + 'server',
            context: absPath.engine(),
            target: 'node',
            entry: absPath.src('server/index.cjs'),
            output: {
                path: absPath.dist(),
                filename: 'server.cjs',
                clean: true
            },
            externals: {
                express: 'commonjs express',
            },
            module: {
                rules: [
                    {
                        test: /\.(js)$/,
                        exclude: new RegExp(`/${enginePackageJson.name}\\/node_modules/`),
                        use: {
                            loader: 'babel-loader',
                            options: {
                                "presets": [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": 'node 16'
                                            },
                                            "exclude": ["proposal-dynamic-import"]
                                        }
                                    ]
                                ]
                            }
                        }
                    }
                ]
            },
            plugins,
            resolve: {
                alias: {
                    helper: absPath.src('engine/helper') + '/',
                    shared: absPath.src('shared') + '/'
                },
                extensions: ['*', '.js']
            }
        }
    }

    const webpackConfigs = [getEngineWebpackConfig()]
    if (useServer) {
        webpackConfigs.push(getServerWebpackConfig())
    }
    return webpackConfigs
}

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
        for (const [ target, config ] of toPairs(buildsJson)) {
            distTargets.push({ target, path: absPath.dists(target), config })
        }
    } else {
        if (isDist) queue.addClear(absPath.dist(), true)
        distTargets.push({config: {}})
    }

    mainSection(`1. Generate webpack configs...`)

    queue.process()
    let lastEngineConfig = null
    let resultConfigs = []
    const buildInstructions = []

    for (const { target, path, ...distTarget } of distTargets) {
        queue.clear()
        if (path) absPath.setCurrDist(path)

        hasLogLevel('normal') && colorLog(
            target ? `Build "${bold(target)}":\n` : `Starting ${bold(isDist ? 'dist' : 'dev')} build:\n`
        )

        subSection('Validating build config')
        const rawConfig = buildConfig(configs.configJson, process.env, distTarget.config, isDist)
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
            if (target) {
                buildInstructions.push(`Build ` + bold(target) + ':')
                buildInstructions.push('')
            }
            buildInstructions.push( ...hosting.messages )
            buildInstructions.push('')
        }
        resultConfigs.push( ...webpackConfigs )
    }

    const webpackHook = getDefaultFromModule(absPath.game('webpack-hook.cjs'), 'function', false)
    if (webpackHook) {
        subSection('Passing all generated webpack configs to webpack hook')
        resultConfigs = webpackHook(resultConfigs, configs.config, options)
        if (!isArray(resultConfigs))
            throw Error(`Webpack hook result must be of type array but got ${simpleType(resultConfigs)}`)

        subSectionOk()
    }
    if (!info && isDist && hasLogLevel('minimal')) {
        lastEngineConfig.plugins.push(
            new PostBuildMessagePlugin([
                ...buildInstructions
            ])
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

module.exports = {
    getTargetWebpackConfigs,
    runWebpackConfigGeneration
}