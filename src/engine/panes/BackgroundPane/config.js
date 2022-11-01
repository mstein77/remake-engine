import { Config } from "core/config";
import inst from "core/instances"

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

    setColor(value) {
        this.color = this.validateColor(value)
        return this
    }

    setImages(values) {
        this.images = this.validateImgObjects(values)
        return this
    }

    validateImgObject(value) {
        this.validateObject(value);
        const { image, x, y } = value;
        return {
            image: this.validateImageResource(image),
            x: this.validateInt(x),
            y: this.validateInt(y)
        }
    }

    validateImgObjects(values) {
        this.validateArray(values);
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

    applyTo(obj) {
        super.applyTo(obj);
        obj.color = this.color;

        const imgIds = [];
        const imgCanvas = [];
        const imgPos = [];
        for (let { image, x, y } of this.images) {
            imgIds.push(image.id);
            imgCanvas.push(image.getCanvasElem());
            imgPos.push({x, y});
        }
        obj.imgIds = imgIds;
        obj.imgCanvas = imgCanvas;
        obj.imgPos = imgPos;

        return obj;
    }

    addRebuildProps(obj, deep, base) {
        obj.color = base.color;
        const images = [];
        let i = 0;
        while (i < base.imgIds.length) {
            images.push({
                image: deep ? inst.RL.makeImageResource(base.imgCanvas[i], base.imgIds[i]) : base.imgIds[i],
                x: base.imgPos[i].x,
                y: base.imgPos[i].y
            });
            i++;
        }
        obj.images = images;
        return obj
    }

    getSubResources() {
        const result = [];
        for (let item of this.images) {
            result.push({id: item.image.id, type: 'image', data: item.image})
        }
        return result;
    }
}