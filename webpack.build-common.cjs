const path = require('path');

const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
    port: {type: 'int'},
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
    publicDistPath,
    getConfigForCtx,
    extractEnvOverwrites,
    getServerWebpackConfig: args => {
        const config = getConfigForCtx(args);
        return {
            name: 'server',
            context: __dirname,
            dependencies: ['frontend'],
            target: 'node',
            entry: getPath(__dirname, 'src/server/index.js'),
            output: {
                path: publicDistPath,
                filename: 'server.js'
            },
            externals: 'express',
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
            plugins: [  // Array of plugins to apply to build chunk
                new DefinePlugin({
                    BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:8080'),
                    PORT: JSON.stringify(config.port ? config.port : 8080)
                })
            ],
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
        const entryParts = [getPath(gamePath, 'src/index.js')];
        if (config.editor) {
            entryParts.push(getPath(__dirname, 'src/engine/editor/index.js'))
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
                filename: 'js/[name].js',  // Name of generated bundle after build
                publicPath: '/' // public URL of the output directory when referenced in a browser
            },
            optimization: {
                minimize: config.minimize,
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
                            filename: 'js/[name].js'
                        },
                        common: {
                            minChunks: 2,
                            priority: -10,
                            filename: 'js/[name].js'
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
                        use: ['style-loader', 'css-loader']
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
            plugins: [  // Array of plugins to apply to build chunk
                new DefinePlugin({
                    BASE_URL: JSON.stringify(config.baseUrl ? config.baseUrl : 'http://localhost:8080')
                }),
                new HtmlWebpackPlugin({
                    template: getPath(__dirname, "src/engine/index.html"),
                    inject: 'body',
                    title: config.title
                }),
            ],
            resolve: {
                alias: {
                    helper: path.resolve(__dirname, 'src/engine/helper/'),
                    editor: path.resolve(__dirname, 'src/engine/editor/'),
                    core: path.resolve(__dirname, 'src/engine/core/'),
                    panes: path.resolve(__dirname, 'src/engine/panes/')
                },
                extensions: ['*', '.js', '.jsx']
            }
        }
    }
};
