const path = require('path');
const {DefinePlugin} = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const basePath = __dirname + '/../../';

const distPath = path.resolve(basePath, 'dist');
const devMode = process.env.NODE_ENV !== "production";

const config = env => {
    return {
        entry: {
            game: basePath + 'src/index.js'
        },
        output: {
            path: distPath,
            clean: true,
            filename: '[name].js',  // Name of generated bundle after build
            publicPath: '/' // public URL of the output directory when referenced in a browser
        },
        devServer: {
            contentBase: distPath,  //source of static assets
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
                    use: 'babel-loader',
                    exclude: [
                        /2dfireengine\/node_modules/
                    ]
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
                template: __dirname + "/src/public/index.html",
                inject: 'body',
                title: 'Production'
            })
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode: 'development'
    }
};

module.exports = config;