const Deliverable = require("../deliverable.cjs")
const { RESOURCE_LOADING} = require("../config.cjs");

/**
 * A class for building the game as a single html file which includes all resources, style and scripts
 */
class HtmlFile extends Deliverable {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.hasMakeStep = false
        this.isAllInOne = true
        this.hasAppIcon = false
        this.hasFavIcon = true
    }

    /**
     * @inheritDoc
     */
    supportsResourceLoading(value) {
        if (value === RESOURCE_LOADING.LOCAL_ALL) return true

        return RESOURCE_LOADING.LOCAL_ALL
    }
}

module.exports = HtmlFile