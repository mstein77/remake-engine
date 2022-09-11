const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig } = require('./webpack.build-common.cjs');

module.exports = (args, env) => {
    const config = getConfigForCtx(args, env);
    return (
        merge(
            getCommonWebpackConfig(args, env),
            {
                mode: 'production'
            }
        )
    )
}