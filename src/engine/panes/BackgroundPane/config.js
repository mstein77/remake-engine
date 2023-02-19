import { Config } from "core/config"
import { validated } from "helper/validate"
import { d } from "helper/helper"
import { AppliedImage } from "core/classes"

export class BackgroundPaneConfig extends Config {

    getFieldProps() {
        return {
            x: {min: -9999, max: 9999},
            y: {min: -9999, max: 9999}
        };
    }

    getDefaults() {
        return {
            color: '#000000',
            images: []
        }
    }

    applyPropsTo(obj) {
        obj.color = this.color
        obj.images = []
        obj.imgPos = []
        for (let { image, x, y } of this.images) {
            obj.images.push(new AppliedImage(image))
            obj.imgPos.push({ x, y });
        }
        return obj;
    }

    setColor(value) {
        this.color = validated.color(value)
        return this
    }

    setImages(values) {
        this.images = this.validateImgObjects(values)
        return this
    }

    validateImgObject(value) {
        validated.object(value);
        const { image, x, y } = value;
        return {
            image: validated.imageResource(image),
            x: validated.int(x),
            y: validated.int(y)
        }
    }

    validateImgObjects(values) {
        validated.array(values);
        const newValues = [];
        for (let value of values) {
            newValues.push(this.validateImgObject(value));
        }
        return newValues;
    }

    addImage(image, x = 0, y = 0) {
        this.images.push({ image, x, y })
        return this
    }

    addRebuildProps(obj, deep, base) {
        obj.color = base.color;
        obj.images = [];
        let i = 0;
        while (i < base.images.length) {
            const { x, y } = base.imgPos[i]
            const image = base.images[i]
            obj.images.push({
                image: deep ? image.imageResource : image.id,
                x,
                y
            })
            i++
        }
    }

    getDependentImages(model) {
        const result = [];
        for (let image of model.images) {
            result.push(image)
        }
        return result
    }
}