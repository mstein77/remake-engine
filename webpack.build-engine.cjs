const path = require('path');

const distPath = path.resolve(__dirname, 'dist-engine');
const devMode = process.env.NODE_ENV !== "production";

const config = env => {
    return {
        entry: {
            engine: './src/engine/index.js'
        },
        output: {
            path: distPath,
            clean: true,
            filename: 'engine.js',  // Name of generated bundle after build
            globalObject: 'typeof self !== \'undefined\' ? self : this',
            library: {
                name: '2dfireengine',
                type: 'umd',
                umdNamedDefine: true,
                export: 'default'
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
                }
            ]
        },
        plugins: [  // Array of plugins to apply to build chunk
        ],
        resolve: {extensions: ['*', '.js', '.jsx']},
        mode:
            'development'
    }
};

module.exports = config;