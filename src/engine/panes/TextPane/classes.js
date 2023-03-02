import { Model, ChildModel } from "core/model"
import { cloneDeep, d } from "helper/helper"

class FontMap extends Model {

    getDependentImages() {
        return [
            this.image
        ]
    }

    addRebuildProps(obj, deep) {
        obj.width = this.width
        obj.height = this.height
        obj.image = !deep ? this.image.id : this.image.imageResource
        obj.map = cloneDeep(this.map)
    }
}

class TextBlock extends ChildModel {

    update(values) {
        for (const [ key, value ] of Object.entries(values)) {
            this[key] = value
        }
    }

    addRebuildProps(obj, deep) {
        for (const prop of ['x', 'y', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'text', 'font', 'textAlign', 'lineSpacing', 'filters']) {
            obj[prop] = this[prop]
        }
    }
}

export {
    FontMap,
    TextBlock
}