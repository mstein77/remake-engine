const Deliverable = require("../deliverable.cjs")
const { d } = require("../../shared/helper.cjs")

class WindowsExe extends Deliverable {

    getRequiredPlatforms() {
        return ['win32']
    }

    processPostBuild() {
        d(process.platform)
    }
}

module.exports = WindowsExe