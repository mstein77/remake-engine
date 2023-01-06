import inst from "core/instances"
import { Config } from "core/config"
import { getRebuildJsonForModel, getConfigFromInput, d } from "helper/helper";
import { FontMap, TextBlock } from "./classes";

class FontMapConfig extends Config {

    getDefaults() {
        return {
            width: 8,
            height: 8,
            map: {}
        }
    }

    getFieldProps() {
        return {
            width: {min: 1, max: 256},
            height: {min: 1, max: 256}
        };
    }

    setWidth(width) {
        this.width = this.validateInt(width, this.getFieldProps('width'));
    }

    setHeight(height) {
        this.height = this.validateInt(height, this.getFieldProps('height'));
    }

    setImage(image) {
        this.image = this.validateImageResource(image);
    }

    setChars(values) {
        this.validateArray(values);
        for(let value of values) {
            this.validateArray(value, {size: 3});
            const [chars, x, y] = value;
            this.validateString(chars,{min: 1, max: 2});
            if (chars.length === 1) {
                this.addChar(chars, x, y);
            } else {
                this.addRange(chars[0], chars[1], x, y);
            }
        }
    }

    setMap(map) {
        for(let char in this.validateObject(map)) {
            const props = this.validateObject(map[char]);
            this.addChar(char, props.x, props.y);
        }
    }

    addChar(char, x, y) {
        if (this.map === undefined) {
            this.map = {};
        }
        this.map[this.validateString(char, {min: 1, max: 1})] = {
            x: this.validateInt(x, {min: 0}),
            y: this.validateInt(y, {min: 0})
        };
    }

    addRange(from, to, x, y) {
        if (this.width === undefined) {
            throw Error('Width required but not set!');
        }
        const fromCode = this.validateString(from, {min: 1, max: 1}).charCodeAt(0);
        const toCode = this.validateString(to, {min: 1, max: 1}).charCodeAt(0);
        for (let i = fromCode; i <= toCode; i++) {
            this.addChar(String.fromCharCode(i), x, y);
            x += this.width;
        }
    }

    getSubResources() {
        return [{id: this.image.id, type: 'image', data: this.image}];
    }

    addRebuildProps(obj, deep, base) {
        obj.width = base.width;
        obj.height = base.height;
        obj.image = deep ? inst.RL.makeImageResource(base.image, base.imageId) : base.imageId;
        obj.map = { ...base.map };

        return obj;
    }

    applyTo(obj) {
        super.applyTo(obj);
        obj.width = this.width;
        obj.height = this.height;
        obj.imageId = this.image.id;
        obj.image = this.image.getCanvasElem(true);
        obj.map = { ...this.map };

        return obj;
    }
}
// FontMapConfig.__type = 'FontMap';
FontMap.Config = FontMapConfig

class TextBlockConfig extends Config {

    isEditable() {
        return true;
    }

    getDefaults() {
        return {
            x: 0,
            y: 0,
            font: null,
            lineSpacing: 0,
            alignToGrid: false,
            autoCenteringX: false,
            autoCenteringY: false,
            textAlign: 'left',
            text: '',
            filters: ''
        }
    }

    getFieldProps() {
        return {
            x: {min: -9999, max: 9999},
            y: {min: -9999, max: 9999},
            lineSpacing: {min: 0, max: 9999},
            textAlign: {values: ['left', 'right', 'center']}
        };
    }

    setFont(value) {
        this.font = this.validateId(value, {null: true});
    }

    setText(value) {
        this.text = this.validateString(value);
    }

    setTextAlign(value) {
        this.textAlign = this.validateString(value);
    }

    setX(value) {
        this.x = this.validateInt(value, this.getFieldProp('x'));
    }

    setY(value) {
        this.y = this.validateInt(value, this.getFieldProp('y'));
    }

    setLineSpacing(value) {
        this.lineSpacing = this.validateInt(value);
    }

    setAlignToGrid(value) {
        this.alignToGrid = this.validateBool(value)
    }

    setAutoCenteringX(value) {
        this.autoCenteringX = this.validateBool(value);
    }

    setAutoCenteringY(value) {
        this.autoCenteringY = this.validateBool(value);
    }

    setFilters(value) {
        this.filters = this.validateString(value);
    }

    addRebuildProps(obj, deep, base) {
        const defaults = this.getDefaults();
        for (let prop of ['x', 'y', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'text', 'font', 'textAlign', 'lineSpacing', 'filters']) {
            if (defaults[prop] !== undefined && defaults[prop] === base[prop]) continue;
            obj[prop] = base[prop];
        }
        return obj;
    }

    applyTo(obj) {
        super.applyTo(obj);
        obj.x = this.x;
        obj.y = this.y;
        obj.alignToGrid = this.alignToGrid;
        obj.autoCenteringX = this.autoCenteringX;
        obj.autoCenteringY = this.autoCenteringY;
        obj.text = this.text;
        obj.font = this.font;
        obj.textAlign = this.textAlign;
        obj.lineSpacing = this.lineSpacing;
        obj.filters = this.filters;
        const lines = this.text.split('\n');
        let maxWidth = 0;
        for (let line of lines) {
            maxWidth = Math.max(maxWidth, line.length);
        }
        obj.width = maxWidth;
        obj.height = lines.length;
        return obj;
    }
}
TextBlock.Config = TextBlockConfig

class TextPaneConfig extends Config {

    getSubResources() {
        const result = [];
        for (let item of this.fonts) {
            result.push({
                id: item.id,
                type: 'json',
                data: item
            });
        }
        return result;
    }

    addRebuildProps(obj, deep, base) {
        obj.fonts = [];
        if (base.fonts) {
            for(let font of base.fonts) {
                obj.fonts.push(
                    getRebuildJsonForModel(FontMap, font, deep)
                );
            }
        }
        return obj;
    }

    setFonts(fonts) {
        this.fonts = this.validateConfigs(FontMap, fonts);
    }

    addFont(font) {
        if (!this.fonts) {
            this.fonts = [];
        }
        this.fonts.push(this.validateConfig(FontMap, font));
    }

    getDefaults() {
        return {
            fonts: []
        };
    }

    applyTo(obj) {
        super.applyTo(obj)
        obj.fonts = [ ...this.fonts ]
        return obj
    }
}
// TextPaneConfig.__type = 'TextPane';
TextPaneConfig.deps = {
    font: FontMapConfig,
    block: TextBlockConfig
};

export {
    FontMapConfig,
    TextBlockConfig,
    TextPaneConfig
}