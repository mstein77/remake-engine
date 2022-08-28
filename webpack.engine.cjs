const path = require('path');

const distPath = path.resolve(__dirname, 'dist-engine');

const glob = require("glob");
const {DefinePlugin} = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const StatoscopeWebpackPlugin = require('@statoscope/webpack-plugin').default;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const devMode = process.env.NODE_ENV !== "production";

const globPath = './src/engine/panes/*/config.js';
const paneFiles = glob.sync(globPath);

const config = env => {
    return {
        entry: {
            engine: [
                './src/engine/index.js', ...paneFiles
            ],
            editor: [
                './src/engine/editor/index.js'
            ]
        },
        output: {
            path: distPath,
            clean: true,
            filename: '[name].js',  // Name of generated bundle after build
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
                            return `${cacheGroupKey}.${packageName.replace("@", "")}`;
                        }
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
                    test: /\.(js|jsx)$/,
                    use: 'babel-loader',
                    exclude: [
                        /node_modules/
                    ]
                },
                {
                    test: /\.css$/i,
                    use: [
                        devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
                        'css-loader'
                    ],
                },
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
            }),
            new MiniCssExtractPlugin(),
            // new BundleAnalyzerPlugin({}),
            /*
            new StatoscopeWebpackPlugin({
                open: true
            }),

             */
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode:
//        'production'
            'development'
        ,
        devtool: false,
        devServer: {  // configuration for webpack-dev-server
            contentBase: distPath,  //source of static assets
            port: 7700, // port to run dev-server
        }
    }
};

module.exports = config;