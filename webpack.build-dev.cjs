const setupAppMiddlewares = require('./src/server/setupMiddlewares.cjs');

const merge = require('webpack-merge');
const { getConfigForCtx, getCommonWebpackConfig, publicDistPath } = require('./webpack.build-common.cjs');

module.exports = (env, args) => {
    const config = getConfigForCtx(args);
    console.log();
    console.log('Building game in develop mode with the following config following:', config);
    console.log();

    let open = false;
    if (config.openBrowser) {
        if (config.openBrowser === 'default') {
            open = true;
        } else {
            open = {app: {name: config.openBrowser}}
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
                        logging: config.logging
                    },
                    open,
                    setupMiddlewares: (middlewares, devServer) => {
                        if (!devServer) {
                            throw new Error('webpack-dev-server is not defined!');
                        }
                        setupAppMiddlewares(devServer.app);
                        return middlewares;
                    },
                    static: publicDistPath, //source of static assets
                    port: config.port // port to run dev-server
                }
            }
        )
    );
}