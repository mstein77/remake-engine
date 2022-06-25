const path = require('path');
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
    resolve: {extensions: ['*', '.js', '.jsx']},
    plugins: [  // Array of plugins to apply to build chunk
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: __dirname + "/src/public/index.html",
            inject: 'body',
            title: 'Production'
        })
    ]
};