const path = require('path');

const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const StatoscopeWebpackPlugin = require('@statoscope/webpack-plugin').default;
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const gamePath = path.resolve(__dirname, '../../');
const gameDistPath = path.resolve(gamePath, 'dist');
const publicDistPath = path.resolve(gameDistPath, 'public');

function getPath(dir, rel) {
    let path = dir;
    if (!path.endsWith('/')) {
        path += '/';
    }
    return path + rel;
}

const configParams = {
    title: {type: 'string'},
    browsers: {type: 'string'},
    editor: {type: 'bool'},
    touch: {type: 'bool'},
    gzip: {type: 'bool'},
    minimize: {type: 'bool'},
    server: {type: 'bool'},
    baseUrl: {type: 'string', key: 'baseUrl'},
    sourcemaps: {type: 'bool', key: 'sourceMaps'},
    sourcemaptype: {type: 'string', key: 'sourceMapType'},
    openbrowser: {type: 'string', key: 'openBrowser'},
    port: {type: 'int'},
    logging: {type: 'string'},
    stats: {type: 'string'},
    envprefix: {type: 'string', key: 'envPrefix'},
}

require('dotenv').config({path: getPath(gamePath, '.env')});

const configJson = true ? require(getPath(gamePath, 'config.cjs')) : {};

function extractEnvOverwrites(config, env) {
    let prefix = config.envPrefix;
    if (!prefix || !env) return {};

    prefix = prefix.toLowerCase();
    const len = prefix.length;
    const envOverwrites = {};
    for (let [name, value] of Object.entries(env)) {
        name = name.toLowerCase();
        if (!name.startsWith(prefix) || name.length <= len) continue;
        const lcKey = name.substring(len);
        const configParam = configParams[lcKey];
        if (!configParam) continue;
        switch (configParam.type) {
            case 'bool':
                if (['true', 'false'].includes(value.toLowerCase())) {
                    value = value[0].toLowerCase() === 't';
                }
                break;

            case 'int':
                value = parseInt(value, 10);
                break;
        }
        envOverwrites[configParam.key ? configParam.key : lcKey] = value
    }
    return envOverwrites
}

function extractAppEnvOverwrites(config, env) {
    const appEnv = env.APP_ENV;
    const appEnvOverwrites = {};
    const keys = Object.keys(config);
    for (let key of keys) {
        const match = key.match(/^([a-z]+)\[([a-z]+)\]$/i);
        if (!match) continue;
        const matchEnv = match[2];
        const matchKey = match[1];
        if (appEnv && matchEnv === appEnv) {
            appEnvOverwrites[matchKey] = config[key];
        }
        delete config[key];
    }
    return appEnvOverwrites
}

function getConfigForCtx(args) {
    const configArg = args && args.config;
    const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'));
    const { dist, ...config } = configJson;
    const envOverwrites = extractEnvOverwrites(config, process.env);
    const appEnvOverwrites = extractAppEnvOverwrites(config, process.env);
    if (!isDistBuild || !dist) return { ...config, ...appEnvOverwrites, ...envOverwrites };

    for (let [key, value] of Object.entries(dist)) {
        if (key === 'envPrefix') continue;
        config[key] = value;
    }
    return { ...config, ...appEnvOverwrites, ...envOverwrites };
}

module.exports = {
    gamePath,
    publicDistPath,
    getConfigForCtx,
    extractEnvOverwrites,
    getServerWebpackConfig: args => {
        const config = getConfigForCtx(args);
        const port = config.port ? config.port : 8080;
        const plugins = [
            new DefinePlugin({
                BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:' + port),
                PORT: JSON.stringify(port),
                LOGGING: JSON.stringify(config.serverLogging),
                LOGGING_FORMAT: JSON.stringify(config.serverLoggingFormat)
            })
        ];
        return {
            name: 'server',
            context: __dirname,
            dependencies: ['frontend'],
            target: 'node',
            entry: getPath(__dirname, 'src/server/index.cjs'),
            output: {
                path: gameDistPath,
                filename: 'server.cjs'
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
                    helper: path.resolve(__dirname, 'src/engine/helper/')
                },
                extensions: ['*', '.js']
            }
        }
    },
    getCommonWebpackConfig: args => {
        const config = getConfigForCtx(args);
        const configArg = args && args.config;
        const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'));
        const entryParts = [getPath(gamePath, 'src/index.js')];
        if (config.editor) {
            entryParts.push(getPath(__dirname, 'src/engine/editor/index.js'))
        }
        const plugins = [
            new DefinePlugin({
                BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:8080')
            }),
            new HtmlWebpackPlugin({
                template: getPath(__dirname, "src/engine/index.html"),
                inject: 'body',
                title: config.title
            })
        ];
        if (true || isDistBuild) {
            plugins.push(new CssMinimizerPlugin());
            plugins.push(new MiniCssExtractPlugin({filename: 'css/[name].[contenthash].css'}))
        }
        if (config.eslint) {
            plugins.push(
                new ESLintPlugin({
                    context: path.join(gamePath, 'src'),
                    overrideConfigFile: path.join(gamePath, '.eslintrc.cjs')
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
        ];
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
            }));
        }
        return {
            name: 'frontend',
            context: __dirname,
            devtool: config.sourceMaps && config.sourceMapType,
            entry: {
                game: entryParts
            },
            output: {
                path: publicDistPath,
                clean: true,
                filename: 'js/[' + (isDistBuild ? 'contenthash' : 'name') + '].js',  // Name of generated bundle after build
                publicPath: '/' // public URL of the output directory when referenced in a browser
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
                                )[1];
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
                    helper: path.resolve(__dirname, 'src/engine/helper/'),
                    editor: path.resolve(__dirname, 'src/engine/editor/'),
                    core: path.resolve(__dirname, 'src/engine/core/'),
                    panes: path.resolve(__dirname, 'src/engine/panes/')
                },
                extensions: ['*', '.js', '.jsx']
            },
            infrastructureLogging: {
                level: config.logging,
                debug: config.debugPlugins,
            }
        }
    }
};
