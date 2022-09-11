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
const configJson = require(getPath(gamePath, 'config.cjs'));

const getConfigForCtx = (env, args) => {
    const configArg = args && args.config;
    const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'));
    if (!isDistBuild || !configJson.dist) return configJson;

    const config = { ...configJson };
    for (let [key, value] of Object.entries(configJson.dist)) {
        config[key] = value;
    }
    return config;
}

module.exports = {
    publicDistPath,
    getConfigForCtx,
    getCommonWebpackConfig: (env, args) => {
        const config = getConfigForCtx(env, args);
        const entryParts = [getPath(gamePath, 'src/index.js')];
        if (config.editor) {
            entryParts.push(getPath(__dirname, 'src/engine/editor/index.js'))
        }

        return {
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
