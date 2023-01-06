const absPath = require('./src/build/classes/absPath.cjs')
const syncFs = require('./src/build/classes/syncFs.cjs')
const { getConfigForCtx, configJson, RESOURCE } = require('./src/build/classes/config.cjs')

const { DefinePlugin, NormalModuleReplacementPlugin } = require("webpack")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const ESLintPlugin = require('eslint-webpack-plugin')
const TerserPlugin = require("terser-webpack-plugin")
const StatoscopeWebpackPlugin = require('@statoscope/webpack-plugin').default
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyWebpackPlugin = require('copy-webpack-plugin')
const PostBuildMessagePlugin = require("./src/build/plugin/PostBuildMessagePlugin.cjs")

const Hosting = require(absPath.src('build/hosting/' + configJson().hosting + '.cjs'))
const path = require("path");
const enginePackageJson = syncFs.readJson(absPath.engine('package.json'))
const gamePackageJson = syncFs.readJson(absPath.game('package.json'))
const gameId = gamePackageJson.name

module.exports = {
    gameId,
    absPath,
    getConfigForCtx,
    getServerWebpackConfig: args => {
        const config = getConfigForCtx(args)
        const configArg = args && args.config
        const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'))
        const port = config.port ? config.port : 8080
        const plugins = [
            new DefinePlugin({
                BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:' + port),
                PORT: JSON.stringify(port),
                VERSION_ENGINE: JSON.stringify(enginePackageJson.version),
                VERSION_GAME: JSON.stringify(gamePackageJson.version),
                LOGGING: JSON.stringify(config.serverLogging),
                LOGGING_FORMAT: JSON.stringify(config.serverLoggingFormat),
                IS_DIST: JSON.stringify(isDistBuild),
                API_MAX_JSON_SIZE: JSON.stringify(config.apiMaxJsonSize),
                LOAD_STATIC: JSON.stringify(config.resourceLoading === RESOURCE.LOADING.STATIC),
                RESOURCES_API: JSON.stringify(!isDistBuild || config.resourceLoading === RESOURCE.LOADING.API)
            })
        ];
        return {
            name: 'server',
            context: absPath.engine(),
            target: 'node',
            entry: absPath.src('server/index.cjs'),
            output: {
                path: absPath.dist(),
                filename: 'server.cjs',
                clean: true
            },
            stats: {
                preset: config.stats,
                logging: config.logging,
                colors: true
            },
            externals: {
                express: 'commonjs express',
            },
            module: {
                rules: [
                    {
                        test: /\.(js)$/,
                        exclude: /2dfireengine\/node_modules/,
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
                    helper: absPath.src('engine/helper') + '/'
                },
                extensions: ['*', '.js']
            }
        }
    },
    getCommonWebpackConfig: args => {
        const config = getConfigForCtx(args)
        const configArg = args && args.config
        const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'))
        const hosting = new Hosting(config, isDistBuild)
        const pubPrefix = config.server ? 'public' : ''

        const plugins = [
            new DefinePlugin({
                BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:8080'),
                SCREEN_BG_RGB: JSON.stringify(config.screenBgRgb),
                EDITOR_KEY: JSON.stringify(config.editorKey),
                VERSION_ENGINE: JSON.stringify(enginePackageJson.version),
                VERSION_GAME: JSON.stringify(gamePackageJson.version),
                GAME_ID: JSON.stringify(gameId),
                IS_DIST: JSON.stringify(isDistBuild),
                RESOURCES_API: JSON.stringify(!isDistBuild ||config.resourceLoading === RESOURCE.LOADING.API)
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                inject: 'body',
                title: config.title,
                meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
            })
        ];

        const entryParts = [absPath.game('src/index.js')]
        if (config.editor) {
            entryParts.push(absPath.src('engine/editor/index.js'))
        }
        if (isDistBuild && config.resourceLoading !== RESOURCE.LOADING.API) {
            const getResourceIds = type => syncFs.readFilesRec(absPath.resources(type))
            const getResourcesJson = name => {
                const filePath = absPath.resources(name + '.json')
                return syncFs.fileExists(filePath) ? syncFs.readJson(filePath) : {}
            }
            const getResourceCache = (type, ids) => {
                const cache = {}
                const ext = type === 'json' ? '.json' : ''

                const getContent =
                    type === 'json' ? filePath => syncFs.readJson(filePath) :
                        filePath => {
                            const imgContent = syncFs.readFile(filePath)
                            const imgType = path.extname(filePath)
                            const base64Image = Buffer.from(imgContent, 'binary').toString('base64')
                            return `data:image/${imgType.split('.').pop()};base64,${base64Image}`
                        }

                for (const id of ids) {
                    const filePath = absPath.resources(type, id + ext)
                    let content = getContent(filePath)
                    cache[id] = content
                }
                return cache
            }
            const static = {
                json: getResourceIds('json').map(id => id.endsWith('.json') ? id.substring(0, id.length - 5) : id),
                image: getResourceIds('image'),
                audio: getResourceIds('audio')
            }
            const useCache = config.resourceLoading === RESOURCE.LOADING.LOCAL
            const resourceInfo = {
                cache: {
                    json: useCache ? getResourceCache('json', static.json) : {},
                    image: useCache ? getResourceCache('image', static.image) : {},
                    audio: {}
                },
                indirect: getResourcesJson('indirect'),
                direct: getResourcesJson('direct'),
                static
            }
            syncFs.writeContent(
                absPath.tmp('resources-info.js'),
`const resourceInfo = ${JSON.stringify(resourceInfo)}
export default resourceInfo`
            )
            plugins.push(
                new NormalModuleReplacementPlugin(
                    /fetcher\/api/,
                    function (resource) {
                        resource.request = resource.request.replace(
                            /api/,
                            `static`
                        )
                    }
                )
            )
        }
        if (true || isDistBuild) {
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
        /*
        if (config.bundleAnalyser === 'statoscope') {
            plugins.push(new StatoscopeWebpackPlugin({
                open: 'dir',
                watchMode: true
            }))

         */
        if (config.analyseBundles) {
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
        if (true || isDistBuild) {
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
        const patterns = hosting.getCopyPatterns()
        if (patterns.length) {
            plugins.push(new CopyWebpackPlugin({
                patterns
            }))
        }
        plugins.push(new PostBuildMessagePlugin(hosting))
        const dependencies = (!isDistBuild || config.server) ? ['server'] : [];

        return {
            name: 'frontend',
            context: absPath.engine(),
            dependencies,
            devtool: config.sourceMaps && config.sourceMapType,
            entry: {
                game: entryParts
            },
            output: {
                path: absPath.dist(pubPrefix),
                clean: true,
                filename: 'js/[' + (isDistBuild ? 'contenthash' : 'name') + '].js',
                publicPath: '/'
            },
            stats: {
                preset: config.stats,
                logging: config.logging,
                loggingDebug: config.debugPlugins
            },
            optimization: {
                minimize: config.minimize,
                minimizer,
                splitChunks: {
                    chunks: 'all',
                    minSize: 0,
                    cacheGroups: {
                        vendors: {
                            test: /[\\/]2dfireengine[\\/]node_modules[\\/]/,
                            reuseExistingChunk: true,
                            name(module, chunks, cacheGroupKey) {
                                const packageName = module.context.match(
                                    /[\\/]2dfireengine[\\/]node_modules[\\/](.*?)([\\/]|$)/
                                )[1]
                                return `${cacheGroupKey}.${packageName.replace("@", "")}`
                            },
                            filename: 'js/[' + (isDistBuild ? 'contenthash' : 'name') + '].js'
                        },
                        common: {
                            minChunks: 2,
                            priority: -10,
                            filename: 'js/[' + (isDistBuild ? 'contenthash' : 'name') + '].js'
                        }
                    }
                },
                runtimeChunk: "single"
            },
            module: {
                rules: [
                    {
                        test: /\.(js|jsx)$/,
                        exclude: /2dfireengine\/node_modules/,
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
                            true || isDistBuild ? MiniCssExtractPlugin.loader : 'style-loader',
                            {loader: 'css-loader', options: {sourceMap: config.sourceMaps}}
                        ]
                    },
                    {
                        test: /\.(woff|woff2|eot|ttf|otf)$/i,
                        type: 'asset/resource',
                        generator: {
                            filename: 'css/[' + (isDistBuild ? 'contenthash' : 'name') + '][ext]',
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
                    plugins: absPath.src('engine/plugins') + '/'
                },
                extensions: ['*', '.js', '.jsx']
            },
            infrastructureLogging: {
                level: config.logging,
                debug: config.debugPlugins,
            }
        }
    }
}
