const Deliverable = require("../deliverable.cjs")
const { d } = require("../../shared/helper.cjs")

/**
 * A class for building the game as an executable on Windows using C#
 */
class WindowsExe extends Deliverable {

    /**
     * @inheritDoc
     */
    getRequiredPlatforms() {
        return ['win32']
    }

    /**
     * @inheritDoc
     */
    processPostBuild() {}
}

module.exports = WindowsExe