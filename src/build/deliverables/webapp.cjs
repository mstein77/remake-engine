const Deliverable = require("../deliverable.cjs")

/**
 * A class for building a web application which is delivered by a web server
 */
class Webapp extends Deliverable {

    /**
     * @inheritDoc
     */
    getSupport() {
        return { ...super.getSupport(), isAllInOne: false };
    }
}

module.exports = Webapp