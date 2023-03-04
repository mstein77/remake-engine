import inst from "core/instances"
import { d, drawTextBlocks, getTextBlockImage } from "helper/helper"
import { CanvasContainer } from "core/classes"
import { FontMap, TextBlock } from "./models"
import { Pane } from "../classes"
import { Config } from "core/config"
import { validated } from "helper/validate"

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

/**
 * TODO:
 *   - CaseInsensitive
 *   - Scrolling (Buffering?)
 *   - Proper Dirty-Handling (update)
 */
export class TextPaneImpl extends Pane {

    finalizeApply() {
        for (const block of this.blocks) {
            this.updateBlock(block.id, {})
        }
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque)
        return this.container
    }

    getTextBlockIds() {
        return Object.keys(this.id2block)
    }

    removeTextBlock(id) {
        delete this.id2block[id]
        this.dirty = true
    }

    getBlockFont(block) {
        if (!block.font) {
            return null
        }
        for (const font of this.fonts) {
            if (font.id === block.font) {
                return font
            }
        }
        return null
    }

    addTextBlock(block) {
        if (!this.fonts.length === 0)
            throw Error('Text block requires a font!');

        const instance = new TextBlock(block, {parent: this})
        if (instance.font === null) {
            instance.update({font: this.fonts[0].id})
        }
        const font = this.getBlockFont(instance)
        const canvas = getTextBlockImage(instance, font, inst.filterer)
        instance.canvas = {
            elem: canvas,
            ctx: canvas.getContext('2d')
        }
        instance.width = font.width * instance.width
        instance.height = font.height * instance.height
        this.id2block[instance.id] = instance
        this.dirty = true
    }

    addTextBlocks(blocks) {
        for (let block of blocks) {
            this.addTextBlock(block)
        }
    }

    setTextBlockFilters(id, filters) {
        this.updateBlock(id, {filters})
    }

    updateBlock(id, updates) {
        const block = this.id2block[id]
        block.update(updates)
        const canvas = getTextBlockImage(
            block,
            this.getBlockFont(block),
            inst.filterer
        )
        block.canvas = {
            elem: canvas,
            ctx: canvas.getContext('2d')
        }
        this.dirty = true
    }

    updateTextBlock(id, text) {
        this.updateBlock(id, {text})
    }

    render() {
        const ctx = this.container.getCanvasCtx()

        ctx.clearRect(0, 0, this.paneDim.x, this.paneDim.y)
        drawTextBlocks(ctx, this.paneDim, Object.values(this.id2block), this.fonts)
        this.dirty = false
    }

    getPreview() {
        return {
            type: 'plane',
            texture: this.container.canvas.elem.toDataURL('image/png'),
            color: null,
            width: this.paneDim.x,
            height: this.paneDim.y
        }
    }

    getDependentModels() {
        return [ ...this.fonts, ...this.blocks ]
    }

    addRebuildProps(obj, deep) {
        const fonts = []
        for (const font of this.fonts) {
            fonts.push(
                this.getRebuildModel(font, deep)
            )
        }
        obj.fonts = fonts
        const blocks = []
        for (const block of this.blocks) {
            blocks.push(
                this.getRebuildModel(block, deep)
            )
        }
        obj.blocks = blocks
    }
}

const type = Pane.createType(
    {name: 'TextPane', editor: true},
    TextPane,
    TextPaneConfig,
)

export function TextPane(...args) {
    return TextPaneImpl.newInst(type, ...args)
}