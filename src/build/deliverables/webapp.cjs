const Deliverable = require("../deliverable.cjs")

class Webapp extends Deliverable {
    getSupport() {
        return { ...super.getSupport(), isAllInOne: false };
    }
}

module.exports = Webapp