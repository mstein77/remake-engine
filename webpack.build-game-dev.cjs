const merge = require('webpack-merge');
const { common, publicDistPath, config } = require('./webpack.build-common.cjs');

const merged = merge(common, {
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
});
console.log(merged);

module.exports = merged;