const path = require('path');

const webpack = require('webpack');
const distPath = path.resolve(__dirname, 'dist-engine');
const devMode = process.env.NODE_ENV !== "production";

const config = env => {
    return [{
        entry: {
            engine: './src/engine/index.js'
        },
        output: {
            path: distPath,
            clean: true,
            filename: 'engine.js',  // Name of generated bundle after build
            globalObject: 'globalThis',
            library: {
                name: '2dfireengine',
                type: 'umd',
                umdNamedDefine: true
            }
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
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode:
            'development'
    },
    {
        entry: {
            engine: './src/engine/editor/index.js'
        },
        output: {
            path: distPath,
            filename: 'editor.js'
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
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode:
            'development'
    }]
};

module.exports = config;