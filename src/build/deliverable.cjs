class Deliverable {
    constructor() {
        this.supports = this.getSupport()
    }

    getRequiredPlatforms() {
        return []
    }

    processPostBuild() {}

    get isAllInOne() {
        return this.supports.isAllInOne
    }
    getSupport() {
        return {
            isAllInOne: true
        }
    }

}

module.exports = Deliverable