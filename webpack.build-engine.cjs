const path = require('path');
const distPath = path.resolve(__dirname, 'dist');

const babelLoader =                 {
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
                            "browsers": ['>2.25%, not ie 11, not op_mini all']
                        },
                        "exclude": ["proposal-dynamic-import"]
                    }
                ],
                "@babel/preset-react"
            ]
        }
    }
};

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
                    test: /\.m?js$/,
                    resolve: {
                        fullySpecified: false
                    }
                },
                babelLoader,
                {
                    test: /\.(css)$/,
                    use: ['style-loader', 'css-loader']
                }
            ]
        },
        plugins: [  // Array of plugins to apply to build chunk
        ],
        resolve: {
            alias: {
                helper: path.resolve(__dirname, 'src/engine/helper/'),
                editor: path.resolve(__dirname, 'src/engine/editor/'),
                core: path.resolve(__dirname, 'src/engine/core/'),
                panes: path.resolve(__dirname, 'src/engine/panes/'),
            },
            extensions: ['*', '.js', '.jsx']
        },
        mode:
            'development'
    },
    {
        entry: {
            editor: './src/engine/editor/index.js'
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
                    test: /\.m?js$/,
                    resolve: {
                        fullySpecified: false
                    }
                },
                babelLoader,
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
        ],
        resolve: {
            alias: {
                helper: path.resolve(__dirname, 'src/engine/helper/'),
                editor: path.resolve(__dirname, 'src/engine/editor/'),
                core: path.resolve(__dirname, 'src/engine/core/'),
                panes: path.resolve(__dirname, 'src/engine/panes/')
            },
            extensions: ['*', '.js', '.jsx']
        },
        mode: 'development'
    }]
};

module.exports = config;