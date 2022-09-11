const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig } = require('./webpack.build-common.cjs');

module.exports = (env, args) => {
    const config = getConfigForCtx(env, args);
    console.log(config);
    return (
        merge(
            getCommonWebpackConfig(env, args),
            {
                mode: 'production'
            }
        )
    )
}