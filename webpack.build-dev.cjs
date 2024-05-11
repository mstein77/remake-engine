const { generateWebpackConfigs } = require("./src/build/build.cjs")

module.exports = (env, args) => generateWebpackConfigs(false)