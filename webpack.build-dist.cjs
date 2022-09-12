const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig } = require('./webpack.build-common.cjs');

module.exports = (env, args) => {
    const config = getConfigForCtx(args);
    console.log();
    console.log('Building game in dist folder with the following config following:', config);
    console.log();
    return (
        merge(
            getCommonWebpackConfig(args),
            {
                mode: 'production'
            }
        )
    )
}