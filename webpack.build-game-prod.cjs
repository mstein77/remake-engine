const merge = require('webpack-merge');
const { common } = require('./webpack.build-common.cjs');

module.exports = merge(common, {
    mode: 'production'
});
