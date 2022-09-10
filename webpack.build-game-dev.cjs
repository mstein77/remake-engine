const merge = require('webpack-merge');
const { common, publicDistPath } = require('./webpack.build-common.cjs');

const merged = merge(common, {
    mode: 'development',
    devtool: "eval-cheap-source-map",
    devServer: {
        client: {
            progress: true,
            overlay: true,
        },
        open: true,
        static: publicDistPath, //source of static assets
        port: 7700 // port to run dev-server
    }
});
console.log(merged);

module.exports = merged;