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
const config = require(getPath(gamePath, 'config.cjs'));

const entryParts = [getPath(gamePath, 'src/index.js')];
if (config.editor) {
    entryParts.push(getPath(__dirname, 'src/engine/editor/index.js'))
}

module.exports = {
    publicDistPath,
    getPath,
    common: {
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
            // Instruct webpack not to obfuscate the resulting code
            minimize: false,
            splitChunks: {
                chunks: 'all',
                minSize: 0,
                cacheGroups: {
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name(module, chunks, cacheGroupKey) {
                            const packageName = module.context.match(
                                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                            )[1];
                            return `${cacheGroupKey}.${packageName.replace("@", "")}`
                        },
                        filename: 'js/[name].js'
                    },
                    common: {
                        minChunks: 2,
                        priority: -10
                    }
                }
            },
            runtimeChunk: "single"
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    resolve: {
                        fullySpecified: false
                    }
                },
                {
                    test: /panes_.+_editor_component\.js$/i,
                    loader: 'file-loader',
                    options: {
                        name: 'js/[name].[ext]',
                    }
                },
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
                }
            ]
        },
        plugins: [  // Array of plugins to apply to build chunk
            new DefinePlugin({
                BASE_URL: JSON.stringify(process.env.BASE_URL ? process.env.BASE_URL : 'http://localhost:8080')
            }),
            new HtmlWebpackPlugin({
                template: getPath(__dirname, "src/engine/index.html"),
                inject: 'body',
                title: 'Remake Engine V0.1'
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
};
