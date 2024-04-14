const setupAppMiddlewares = require("../server/setupMiddlewares.cjs")
const { DefinePlugin, NormalModuleReplacementPlugin} = require("webpack")
const { RESOURCE_LOADING} = require("./config.cjs")
const { makeDescriptor, ResourceTypeRegistry} = require("../shared/resources.cjs")
const { FileCodec} = require("../shared/fileCodec.cjs")
const { d, isObject, isArray, csv2values, trim, toKeys, regexpEscape } = require("../shared/helper.cjs")
const { stringifyValues, getReplaceMetaVars, getHtmlTags, exec} = require("./helper.cjs")
const { FILE_OP } = require('./queue.cjs')
const { NoStackError, getBuildLogLevel} = require("../shared/console.cjs")

const HtmlWebpackPlugin = require("html-webpack-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ESLintPlugin = require("eslint-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

let crypto
try {
    crypto = require('node:crypto')
} catch (err) {}

const fontExt2mimeType = {
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2'
}

/**
 * Returns an array holding all webpack configs for building the dist target with the given hosting, configs
 * and options
 *
 * @param {object} configs
 * @param {object} fileDeps
 * @param {Deliverable} deliverable
 * @param {Hosting} hosting
 * @param {object} options
 *
 * @returns {array}
 */
const getTargetWebpackConfigs = (configs, fileDeps, deliverable, hosting, options) => {
    const { target, info, isDist, distTarget } = options
    const { config, enginePackageJson, gamePackageJson, metaVars } = configs
    const { absPath, queue, syncFs } = fileDeps

    const targetPrefix = target ? target + '-' : ''
    FileCodec.init(absPath)

    const gameId = gamePackageJson.name
    const replaceMetaVars = getReplaceMetaVars(metaVars)

    const staticTypes = config.staticTypes
    const requiresApi =
        [RESOURCE_LOADING.API, RESOURCE_LOADING.API_ALL].includes(config.resourceLoading)
    const useServer = isDist && config.server

    const certFilePath = absPath.game('.ssl', 'cert.pem')
    const keyFilePath = absPath.game('.ssl', 'key.pem')

    const common = {
        mode: isDist ? 'production' : 'development',
        stats: {
            preset: getBuildLogLevel()
        },
        ignoreWarnings: [
            {
                message: /Critical dependency/,
            }
        ],
        performance: {
            hints: isDist ? 'warning' : false,
            assetFilter: file => file.endsWith('.js'),
            maxEntrypointSize: 250000
        }
    }

    const getBaseUrl = (host, path) => (
        (config.https ? 'https' : 'http') + `://${host}${port !== (config.https ? 443 : 80) ? ':' + port : ''}` +
        `${path ? '/' + trim(path, '/') : ''}`
    )
    const port = config.https ? config.httpsPort : config.httpPort;
    const defines = {
        BASE_URL: getBaseUrl(config.host, config.path),
        PREVIEW_URL: getBaseUrl('localhost', ''),
        VERSION_ENGINE: enginePackageJson.version,
        VERSION_GAME: gamePackageJson.version,
        GAME_ID: gameId,
        IS_DIST: isDist,
        RESOURCE_TYPES: ResourceTypeRegistry.toJson(),
        STATIC_TYPES: staticTypes,
        RESOURCES_API: !isDist || requiresApi
    }

    const minimizer = !config.minimize ? [] : [
        new TerserPlugin({
            terserOptions: {
                format: {
                    comments: /@license/i
                }
            },
            extractComments: true
        })
    ]

    /**
     * Returns an object holding the webpack config for building the game frontend
     *
     * @returns {object}
     */
    const getGameWebpackConfig = () => {
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
            let server = undefined
            if (config.https) {
                server = {
                    type: 'https',
                    options: {
                        cert: certFilePath,
                        key: keyFilePath

                    }
                }
            }
            webpackConfig.devServer = {
                server,
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

                    setupAppMiddlewares(devServer.app, {
                        ...config,
                        resourceTypes: ResourceTypeRegistry.toJson(),
                        IS_DIST: false
                    })

                    return middlewares
                },
                static: absPath.dist(config.server ? 'public' : ''),
                port: config.https ? config.httpsPort : config.httpPort
            }
        }

        const pubPrefix = config.server ? 'public' : ''

        const cleanUpAssets = assets => {
            for (const key of toKeys(assets)) {
                if (key === 'index.html' || key.endsWith('package.json')) continue
                delete assets[key]
            }
            return ''
        }

        const getCssFromAssets = ({ assets }) => {
            if (!isDist || !deliverable.isAllInOne) return ''

            let css = assets['index.css'].source()

            for (const key of toKeys(assets)) {
                if (!key.startsWith('font_')) continue

                const ext = key.substring(key.lastIndexOf('.') + 1)

                const matchFontFaceSrcUrl = new RegExp('(@font-face[^{]*{[^}]+url\\()(?![\'"]?(https?):).*' +
                    regexpEscape(key) + '[^)]*(\\)[^}]*})', 'mg')

                const font = assets[key]
                const mimeType = fontExt2mimeType[ext]
                if (!mimeType)
                    throw Error(`Could not determine mime type of font "${key}"`)

                const dataUrl = 'data:' + mimeType + ';charset=utf-8;base64,' + font.source().toString('base64')

                css = css.replace(matchFontFaceSrcUrl, '$1' + dataUrl + '$3')
            }
            return `<style>${css}</style>`
        }
        const linkTags = getHtmlTags('link', deliverable.getMetaLinks(distTarget, configs, fileDeps))
        const metaTags = getHtmlTags('meta', deliverable.getMeta(distTarget, configs, fileDeps))

        let scriptTags = ''
        const scripts = deliverable.getScriptTags(distTarget, configs, fileDeps)
        for (let script of scripts) {
            scriptTags += `<script>${isArray(script) ? script.join('\n') : script}</script>`
        }
        const generateScriptTags = compilation => {
            if (!deliverable.isAllInOne) return ''

            let html = ''
            html += `<script>${compilation.assets['index.js'].source()}</script>`
            cleanUpAssets(compilation.assets)
            html += scriptTags

            return html
        }

        const htmlOptions = {
            filename: 'index.html',
            cache: false,
            inject: isDist && deliverable.isAllInOne ? false : 'body',
            templateContent: ({ compilation }) => `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <title>${replaceMetaVars(config.name)}</title>
              ${metaTags}
              ${linkTags}
              ${getCssFromAssets(compilation)}
            </head>
            <body>
              ${generateScriptTags(compilation)}
            </body>
            </html>`
        }
        const plugins = [
            new DefinePlugin(
                stringifyValues(defines)
            ),
            new HtmlWebpackPlugin(htmlOptions)
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
        if (isDist) {
            plugins.push(new CssMinimizerPlugin());
            plugins.push(new MiniCssExtractPlugin({filename: deliverable.isAllInOne ? 'index.css' : 'css/[name].[contenthash].css'}))
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
        const copyOps = queue.extract(FILE_OP.COPY)
        const patterns = []
        for (const { from , to } of copyOps) {
            if (syncFs.fileExists(from) || (syncFs.dirExists(from) && !syncFs.isEmptyDir(from)))
                patterns.push({ from, to })
        }
        if (patterns.length) {
            plugins.push(new CopyWebpackPlugin({
                patterns
            }))
        }
        const dependencies = useServer ? [targetPrefix + 'server'] : []
        const engineNodeModulesMatcher = `[\\\\/]${regexpEscape(enginePackageJson.name)}[\\\\/]node_modules[\\\\/]`

        const minimizers = [ ...minimizer ]
        if (config.minimize) {
            minimizers.push(new CssMinimizerPlugin({
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
                filename: deliverable.isAllInOne ? 'index.js' : 'js/[' + (isDist ? 'contenthash' : 'name') + '].js',
                publicPath: '/'
            },
            optimization: {
                minimize: config.minimize,
                minimizer: minimizers,
                splitChunks: deliverable.isAllInOne ? false : {
                    chunks: 'all',
                    minSize: 0,
                    cacheGroups: {
                        vendors: {
                            test: new RegExp(`/${engineNodeModulesMatcher}/`),
                            reuseExistingChunk: true,
                            name(module, chunks, cacheGroupKey) {
                                const packageName = module.context.match(
                                    new RegExp(`/${engineNodeModulesMatcher}(.*?)([\\\\/]|$)/`)
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
                runtimeChunk: deliverable.isAllInOne ? false : "single"
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
                            isDist ? MiniCssExtractPlugin.loader : 'style-loader',
                            {loader: 'css-loader', options: {sourceMap: config.sourceMaps}}
                        ]
                    },
                    {
                        test: /\.(woff|woff2|eot|ttf|otf)$/i,
                        type: 'asset/resource',
                        generator: {
                            filename: deliverable.isAllInOne ? 'font_[name][ext]' : 'css/[' + (isDist ? 'contenthash' : 'name') + '][ext]',
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

        const httpAuthCredentials = process.env[config.envPrefix + 'HTTP_AUTH_CREDENTIALS']
        let httpAuthJson = null
        if (httpAuthCredentials) {
            try {
                httpAuthJson = JSON.parse(httpAuthCredentials)
            } catch (e) {}
            if (!isObject(httpAuthJson))
                throw NoStackError(`Environment variable ${config.envPrefix + 'HTTP_AUTH_CREDENTIALS'} must be a serialized JSON object`)

        }
        const sslProps = {}
        if (config.https) {
            const sslEnvs = ['SSL_CA', 'SSL_KEY', 'SSL_CERT', 'SSL_PFX', 'SSL_PASSPHRASE']
            for (const env of sslEnvs) {
                const envKey = config.envPrefix + env
                sslProps[env] = envKey in process.env ? process.env[envKey] : ''
            }
        }
        const ssl = !!(config.https && (sslProps['SSL_KEY'] || sslProps['SSL_CERT'] || sslProps['SSL_PFX']))
        const port = ssl ? config.httpsPort : config.httpPort
        const plugins = [
            new DefinePlugin(
                stringifyValues({
                    ...defines,
                    ...{
                        PORT: port,
                        HTTPS_PORT: config.httpsPort,
                        RESTRICTED_CORS: config.restrictedCors,
                        OPEN_BROWSER: config.openBrowser,
                        SSL: ssl,
                        HTTPS: config.https,
                        LOGGING: config.serverLogging,
                        LOGGING_FORMAT: config.serverLoggingFormat,
                        API_MAX_JSON_SIZE: config.apiMaxJsonSize,
                        HTTP_AUTH_JSON: httpAuthJson
                    },
                    ...sslProps
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
            optimization: {
                minimize: config.minimize,
                minimizer
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

    const webpackConfigs = [getGameWebpackConfig()]
    if (useServer) {
        webpackConfigs.push(getServerWebpackConfig())
    }
    return webpackConfigs
}

module.exports = {
    getTargetWebpackConfigs
}