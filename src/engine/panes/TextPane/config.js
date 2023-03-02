import { Config } from "core/config"
import { d, getCanvasForDim } from "helper/helper"
import { validated } from "helper/validate"
import { FontMap, TextBlock } from "./classes"

class FontMapConfig extends Config {

    getDefaults() {
        return {
            width: 8,
            height: 8,
            map: {},
            image: undefined
        }
    }

    getFieldProps() {
        return {
            width: {min: 1, max: 256},
            height: {min: 1, max: 256}
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
    }

    setWidth(width) {
        this.width = validated.int(width, this.getFieldProps('width'))
    }

    setHeight(height) {
        this.height = validated.int(height, this.getFieldProps('height'))
    }

    setImage(image) {
        this.image = validated.imageResource(image)
    }

    setChars(values) {
        validated.array(values)
        for(let value of values) {
            validated.array(value, {size: 3})
            const [chars, x, y] = value
            validated.string(chars,{min: 1, max: 2})
            if (chars.length === 1) {
                this.addChar(chars, x, y)
            } else {
                this.addRange(chars[0], chars[1], x, y)
            }
        }
    }

    setMap(map) {
        this.map = {}
        for(let char in validated.object(map)) {
            const props = validated.object(map[char])
            this.addChar(char, props.x, props.y)
        }
    }

    addChar(char, x, y) {
        if (this.map === undefined) {
            this.map = {}
        }
        this.map[validated.string(char, {min: 1, max: 1})] = {
            x: validated.int(x, {min: 0}),
            y: validated.int(y, {min: 0})
        };
    }

    addRange(from, to, x, y) {
        if (this.width === undefined)
            throw Error('Width required but not set')

        const fromCode = validated.string(from, {min: 1, max: 1}).charCodeAt(0)
        const toCode = validated.string(to, {min: 1, max: 1}).charCodeAt(0)
        for (let i = fromCode; i <= toCode; i++) {
            this.addChar(String.fromCharCode(i), x, y)
            x += this.width
        }
    }
}
FontMapConfig.linkTo(FontMap)

class TextBlockConfig extends Config {

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
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
        const lines = model.text.split('\n')
        let maxWidth = 0
        for (let line of lines) {
            maxWidth = Math.max(maxWidth, line.length)
        }
        model.width = maxWidth
        model.height = lines.length
        if (model.font === null)
            model.font =
                model.parent.fonts.length ? model.parent.fonts[0].id : null
        const canvas = getCanvasForDim(1, 1)
        model.canvas = {
            elem: canvas,
            ctx: canvas.getContext('2d')
        }
    }

    setFont(value) {
        this.font = validated.id(value, {null: true})
    }

    setText(value) {
        this.text = validated.string(value)
    }

    setTextAlign(value) {
        this.textAlign = validated.string(value)
    }

    setX(value) {
        this.x = validated.int(value, this.getFieldProp('x'))
    }

    setY(value) {
        this.y = validated.int(value, this.getFieldProp('y'))
    }

    setLineSpacing(value) {
        this.lineSpacing = validated.int(value)
    }

    setAlignToGrid(value) {
        this.alignToGrid = validated.bool(value)
    }

    setAutoCenteringX(value) {
        this.autoCenteringX = validated.bool(value)
    }

    setAutoCenteringY(value) {
        this.autoCenteringY = validated.bool(value)
    }

    setFilters(value) {
        this.filters = validated.string(value)
    }
}
TextBlockConfig.linkTo(TextBlock)

class TextPaneConfig extends Config {

    getDefaults() {
        return {
            fonts: [],
            blocks: []
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
        const id2block = {}
        for (let block of model.blocks) {
            id2block[block.id] = block
        }
        model.id2block = id2block
    }

    setFonts(fonts) {
        validated.array(fonts)
        for(const font of fonts) {
            this.addFont(font)
        }
    }

    addFont(font) {
        if (!this.fonts) this.fonts = []

        const inst = validated.config(FontMap, font)
        this.fonts.push(
            inst
        );
    }

    setBlocks(value) {
        validated.array(value)
        this.blocks = []
        for (const block of value) {
            this.addBlock(block)
        }
    }

    addBlock(value) {
        if (!this.blocks) this.blocks = []
        this.blocks.push(
            validated.config(TextBlock, value, {parent: this})
        )
    }
}

export {
    FontMapConfig,
    TextBlockConfig,
    TextPaneConfig
}