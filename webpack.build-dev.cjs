const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig, publicDistPath } = require('./webpack.build-common.cjs');

module.exports = (env, args) => {
    const config = getConfigForCtx(env, args);
    return (
        merge(
            getCommonWebpackConfig(env, args),
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