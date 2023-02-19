import inst from "core/instances"
import { TextPaneConfig } from "./config"
import { d, drawTextBlocks, getTextBlockImage } from "helper/helper"
import { CanvasContainer } from "core/classes"
import { TextBlock } from "./classes"
import { Pane } from "../classes"

/**
 * TODO:
 *   - CaseInsensitive
 *   - Scrolling (Buffering?)
 *   - Proper Dirty-Handling (update)
 */
export class TextPane extends Pane {

    constructor(input) {
        super(input)
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

        const instance = new TextBlock(block, this)
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

    getEditorResources() {
        const blocks = [];
        for (let id in this.id2block) {
            blocks.push(
                { ...this.id2block[id].config.getJson() }
            )
        }
        const resources = super.getEditorResources()
        resources.props = { blocks }
        return resources
    }

    static padStart(value, char, len) {
        value = '' + value
        while (value.length < len) {
            value = char + value
        }
        return value
    }
}
TextPaneConfig.linkTo(TextPane)

inst.paneRegistry.add('TextPane', TextPane, {editable: true})