const merge = require('webpack-merge')
const { getConfigForCtx, getCommonWebpackConfig, getServerWebpackConfig } = require('./webpack.build-common.cjs')

module.exports = (env, args) => {
    const config = getConfigForCtx(args)
    frontendWebpackConfig =
        merge(
            getCommonWebpackConfig(args),
            {
                mode: 'production'
            }
        )

    if (!config.server) return frontendWebpackConfig

    return [
        frontendWebpackConfig,
        merge(
            getServerWebpackConfig(args),
            {
                mode: 'production'
            }
        )
    ]
}