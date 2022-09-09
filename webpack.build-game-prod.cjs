const merge = require('webpack-merge');
const { common } = require('./webpack.build-common.js');

module.exports = merge(common, {
    mode: 'production'
});
