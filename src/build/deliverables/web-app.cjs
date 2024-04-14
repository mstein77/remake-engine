const Deliverable = require("../deliverable.cjs")

/**
 * A class for building a web application which is delivered by a web server
 */
class WebApp extends Deliverable {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.hasMakeStep = false
        this.isAllInOne = false
        this.hasAppIcon = false
        this.hasFavIcon = true
    }
}

module.exports = WebApp