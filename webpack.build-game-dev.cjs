const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig, publicDistPath } = require('./webpack.build-common.cjs');

module.exports = (ctx, ctx2) => {
    const config = getConfigForCtx(ctx);
    return (
        merge(
            getCommonWebpackConfig(ctx, ctx2),
            {
                mode: 'development',
                devServer: {
                    client: {
                        progress: true,
                        overlay: true,
                    },
                    open: true,
                    static: publicDistPath, //source of static assets
                    port: config.port // port to run dev-server
                }
            }
        )
    );
}