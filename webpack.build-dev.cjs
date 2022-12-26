const setupAppMiddlewares = require('./src/server/setupMiddlewares.cjs')

const merge = require('webpack-merge')
const { getConfigForCtx, getCommonWebpackConfig, absDir, gameId } = require('./webpack.build-common.cjs')

module.exports = (env, args) => {
    const config = getConfigForCtx(args)
    console.log()
    console.log(`Building game "${gameId}" in develop mode with the following config following:`, config)
    console.log()

    let open = false
    if (config.openBrowser) {
        if (config.openBrowser === 'default') {
            open = true
        } else {
            open = {
                app: {
                    name: config.openBrowser
                }
            }
        }
    }
    return (
        merge(
            getCommonWebpackConfig(args),
            {
                mode: 'development',
                devServer: {
                    client: {
                        progress: true,
                        overlay: true,
                        logging: config.clientLogging
                    },
                    open,
                    compress: config.compress,
                    setupMiddlewares: (middlewares, devServer) => {
                        if (!devServer) {
                            throw new Error('webpack-dev-server is not defined!')
                        }
                        setupAppMiddlewares(devServer.app, { ...config, IS_DIST: false })
                        return middlewares
                    },
                    static: absDir.dist(config.server ? 'public' : ''),
                    port: config.port // port to run dev-server
                }
            }
        )
    )
}