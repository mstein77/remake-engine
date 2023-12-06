const setupAppMiddlewares = require('./src/server/setupMiddlewares.cjs')

const merge = require('webpack-merge')
const { getConfigForCtx, getHosting, getCommonWebpackConfig, absPath} = require('./webpack.build-common.cjs')
const { d } = require('./src/shared/classes/helper.cjs')

module.exports = (env, args) => {
    const config = getConfigForCtx(args)
    const hosting = getHosting(config, false)
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
                        setupAppMiddlewares(devServer.app, { ...config, staticTypes: hosting.getStaticTypes().join(','), IS_DIST: false })
                        return middlewares
                    },
                    static: absPath.dist(config.server ? 'public' : ''),
                    port: config.port // port to run dev-server
                }
            }
        )
    )
}