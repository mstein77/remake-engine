const { d } = require("./src/shared/helper.cjs")
const { generateWebpackConfigs } = require("./src/build/build.cjs")

module.exports = (env, args) => generateWebpackConfigs(true, false)