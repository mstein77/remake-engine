const merge = require('webpack-merge')
const { getConfigForCtx, getCommonWebpackConfig, getServerWebpackConfig } = require('./webpack.build-common.cjs')

module.exports = (env, args) => {
    const config = getConfigForCtx(args)
    console.log();
    console.log('Building game in dist folder with the following config following:', config)
    console.log()

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