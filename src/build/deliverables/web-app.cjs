const Deliverable = require("../deliverable.cjs")

/**
 * A class for building a web application which is delivered by a web server
 */
class WebApp extends Deliverable {

    /**
     * @inheritDoc
     */
    getSupport() {
        return { ...super.getSupport(), isAllInOne: false, favIcon: true };
    }
}

module.exports = WebApp