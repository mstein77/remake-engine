const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig } = require('./webpack.build-common.cjs');

module.exports = (ctx, ctx2) => {
    const config = getConfigForCtx(ctx);
    return (
        merge(
            getCommonWebpackConfig(ctx, ctx2),
            {
                mode: 'production'
            }
        )
    )
}