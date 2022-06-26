const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { DefinePlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        index: "./src/app/index.js",
        editor: "./src/app/editor.js",
        base: "./src/app/base.js",
        layout: "./src/app/layout.js"
    }, // webpack entry point. Module to start building dependency graph
    output: {
        path: path.resolve(__dirname, 'dist'), // Folder to store generated bundle
        filename: 'js/[name].bundle.js',  // Name of generated bundle after build
        publicPath: '/' // public URL of the output directory when referenced in a browser
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader',
                exclude: [
                    /node_modules/
                ]
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_fnames: true,
                },
            }),
        ],
    },
    resolve: {extensions: ['*', '.js', '.jsx']},
    plugins: [  // Array of plugins to apply to build chunk
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: __dirname + "/src/public/index.html",
            inject: 'body',
            title: 'Production'
        }),
        new DefinePlugin({
            BASE_URL: JSON.stringify(process.env.BASE_URL ? process.env.BASE_URL : 'http://localhost:8080')
        })
    ]
};