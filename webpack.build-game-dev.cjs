const path = require('path');
const {DefinePlugin} = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const gamePath = path.resolve(__dirname, '../../');
const gameDistPath = path.resolve(gamePath, 'dist');
const publicDistPath = path.resolve(gameDistPath, 'public');
const engineDistPath = path.resolve(__dirname, 'dist');

const devMode = process.env.NODE_ENV !== "production";

const config = require(gamePath + 'config.cjs');

const entryParts = [gamePath + 'src/index.js'];
if (config.editor) {
    entryParts.push(engineDistPath + 'editor.js')
}

const buildConfig = env => {
    return {
        entry: {
            game: entryParts
        },
        output: {
            path: path.resolve(publicDistPath, 'js'),
            clean: true,
            filename: 'js/[name].js',  // Name of generated bundle after build
            publicPath: '/' // public URL of the output directory when referenced in a browser
        },
        devServer: {
            client: {
                progress: true,
                overlay: true,
            },
            open: true,
            devMiddleware: {
                writeToDisk: true
            },
            static: publicDistPath,  //source of static assets
            port: 7700 // port to run dev-server
        },
        optimization: {
            // Instruct webpack not to obfuscate the resulting code
            minimize: false,
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
                }
            ]
        },
        plugins: [  // Array of plugins to apply to build chunk
            new DefinePlugin({
                BASE_URL: JSON.stringify(process.env.BASE_URL ? process.env.BASE_URL : 'http://localhost:8080')
            }),
            new HtmlWebpackPlugin({
                template: path.resolve(__dirname, "src/engine/index.html"),
                inject: 'body',
                title: 'Remake Engine V0.1'
            })
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode: 'development'
    }
};

module.exports = buildConfig;