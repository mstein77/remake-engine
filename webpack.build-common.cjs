const { getFileNameForHosting, absDir, syncFs, getConfigForCtx, configJson } = require('./src/build/classes.cjs')

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

const Hosting = require(absDir.src('build/hosting/' + getFileNameForHosting(configJson.deployMethod)))
const fs = require("fs");
const path = require("path");
const enginePackageJson = syncFs.readJson(absDir.engine('package.json'))
const gamePackageJson = syncFs.readJson(absDir.game('package.json'))
const gameId = gamePackageJson.name

module.exports = {
    gameId,
    absDir,
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
                RESOURCES_API: JSON.stringify(!isDistBuild || config.resources === 'api')
            })
        ];
        return {
            name: 'server',
            context: absDir.engine(),
            target: 'node',
            entry: absDir.src('server/index.cjs'),
            output: {
                path: absDir.dist(),
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
                    helper: absDir.src('engine/helper') + '/'
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
                RESOURCES_API: JSON.stringify(!isDistBuild ||config.resources === 'api')
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                inject: 'body',
                title: config.title
            })
        ];

        const entryParts = [absDir.game('src/index.js')]
        if (config.editor) {
            entryParts.push(absDir.src('engine/editor/index.js'))
        }
        if (isDistBuild && config.resources !== 'api') {
            const getResourceIds = type => syncFs.readFilesRec(absDir.resources(type))
            const getResourcesJson = name => {
                const filePath = absDir.resources(name + '.json')
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
                    const filePath = absDir.resources(type, id + ext)
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
            const useCache = config.resources === 'local'
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
                absDir.tmp('resources-info.js'),
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
                    context: absDir.src(),
                    overrideConfigFile: absDir.game('.eslintrc.cjs')
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
            context: absDir.engine(),
            dependencies,
            devtool: config.sourceMaps && config.sourceMapType,
            entry: {
                game: entryParts
            },
            output: {
                path: absDir.dist(pubPrefix),
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
                    helper: absDir.src('engine/helper') + '/',
                    editor: absDir.src('engine/editor') + '/',
                    core: absDir.src('engine/core') + '/',
                    panes: absDir.src('engine/panes') + '/',
                    plugins: absDir.src('engine/plugins') + '/'
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
