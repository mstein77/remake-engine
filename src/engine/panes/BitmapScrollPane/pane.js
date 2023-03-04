import inst from "core/instances"
import { BufferedCanvasContainer } from "core/classes"
import { Pane } from "../classes"
import { d } from "helper/helper"
import { Config } from "core/config"
import { SpriteSheet } from "../SpritePane/models"
import { validated } from "helper/validate"

class BitmapScrollPaneConfig extends Config {

    getDefaults() {
        return {
            spriteSheet: undefined,
            map: [],
            axis: 'X',
            min: 0,
            max: 100
        }
    }

    getFieldProps() {
        return {
            axis: {values: ['X', 'Y']}
        }
    }

    setSpriteSheet(value) {
        this.spriteSheet = validated.config(SpriteSheet, value)
    }

    setAxis(value) {
        this.axis = validated.string(value, this.getFieldProp('axis'))
    }

    setMap(value) {
        this.map = validated.array(value)
    }

    setMin(value) {
        this.min = validated.int(value)
    }

    setMax(value) {
        this.max = validated.int(value)
    }

    applyPropsTo(obj) {
        this.applyDefaultKeysTo(obj)
    }
}

/**
 * TODO:
 *   - Y-Scrolling
 *   - Endless-Scrolling
 *   - Events
 *   - Rastering
 *   - Oversize/Scrolling
 *   - Z-Ordering / MultiBitmaps
 */
class BitmapScrollPaneImpl extends Pane {

    finalizeApply() {
        this.maxState = 0;
        this.pos = 0;
        this.state = -1;
        this.maxSpeed = 2;
        this.bufferSpace = 32;
        this.scrollPos = 0;
        this.isScrolling = false;
        this.dirty = true;
        this.bufferPos = 0;
        this.scrollJump = 0;
        this.scrollPos = 0;
        this.scrollDim = (this.axis === 'X') ? 'x' : 'y';
        this.offsetDim = (this.axis === 'X') ? 'y' : 'x';
        for (let entry of this.map) {
            entry.dim = this.spriteSheet.getSpriteDim(entry.bitmap);
        }
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {x: viewPortDimX, y: viewPortDimY};
        this.paneDim = {
            x: viewPortDimX + (this.axis === 'X' ? 3 * this.bufferSpace : 0),
            y: viewPortDimY + (this.axis !== 'X' ? 3 * this.bufferSpace : 0)
        };
        this.scrollPosOffset = {
            x: (this.axis === 'X' ? this.bufferSpace : 0),
            y: (this.axis !== 'X' ? this.bufferSpace : 0)
        };
        this.stateSizes = [];
        const maxSize = (this.axis === 'X') ? this.paneDim.x : this.paneDim.y;
        this.maxState = Math.ceil(this.bufferSpace / this.maxSpeed);
        let copySize = Math.ceil(maxSize / this.maxState);
        let size = 0;
        while (size < maxSize) {
            const newSize = size + copySize;
            this.stateSizes.push(newSize > maxSize ? newSize - maxSize : copySize);
            size = newSize;
        }
        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    getBitmapsInRange(minPos, maxPos) {
        let maxIndex = this.map.length;
        const result = [];
        for (let index = 0; index < maxIndex; index++) {
            const start = this.map[index][this.scrollDim];
            if (start >= maxPos) {
                break;
            }
            const width = this.map[index].dim[this.scrollDim];
            const end = start + width;
            if ((minPos <= start && start < maxPos) ||
                (minPos <= end && end < maxPos) ||
                (minPos >= start && end >= maxPos)
            ) {
                result.push({
                    index,
                    width: Math.min(end, maxPos) - Math.max(start, minPos),
                    offset: Math.max(start, minPos) - start
                });
            }
        }
        return result;
    }

    renderRange(ctx, startPos, endPos, offX = 0, offY = 0) {
        const draws = this.getBitmapsInRange(startPos, endPos);
        ctx.clearRect(
            offX, offY,
            this.axis === 'X' ? endPos - startPos : this.viewPortDim.x,
            this.axis !== 'X' ? endPos - startPos : this.viewPortDim.y
        );
        for (let draw of draws) {
            const bitmap = this.map[draw.index];
            const posX = this.axis === 'X' ? (bitmap.x + draw.offset - this.bufferPos) : bitmap.x;
            const posY = this.axis === 'X' ? bitmap.y : (bitmap.y + draw.offset - this.bufferPos);
            const width = this.axis === 'X' ? draw.width : bitmap.dim.x;
            const height = this.axis !== 'X' ? draw.height : bitmap.dim.y;
            this.spriteSheet.drawSpritePart(
                ctx, bitmap.bitmap,
                posX, posY,
                width, height,
                this.axis === 'X' ? draw.offset : 0,
                this.axis !== 'X' ? draw.offset : 0
            );
        }
    }

    switchBuffer() {
        this.pos = this.bufferPos;
        this.scrollPos += this.scrollJump;
        this.buffers.switchBuffer();
        this.state = 0;
    }

    render() {
        const target = this.buffers.getBufferCtx();
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderRange(target, this.bufferPos, this.bufferPos + this.paneDim.x, 0, 0);
                this.switchBuffer();
                break;

            default:
                if (this.isScrolling) {
                    const offset = (this.state - 1) * this.stateSizes[0];
                    const width = this.stateSizes[this.state - 1];
                    this.renderRange(target, this.bufferPos + offset, this.bufferPos + offset + width, offset, 0);
                    if (this.state === this.maxState) {
                        this.switchBuffer();
                    } else {
                        this.state++;
                    }
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const scrollPosX = (this.axis === 'X' ? this.scrollPos : 0);
        const scrollPosY = (this.axis !== 'X' ? this.scrollPos : 0);

        const posLeft = -(this.scrollPosOffset.x + scrollPosX) + 'px';
        const posTop = -(this.scrollPosOffset.y + scrollPosY) + 'px';

        if (elemStyle.left !== posLeft) {
            inst.game.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            inst.game.addDomOp(elemStyle, 'top', posTop);
        }
    }

    scrollBy(sx, sy) {
        if (Math.max(this.maxSpeed, (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))) > this.maxSpeed) {
            throw Error('Unallowed scroll speed ' + (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))  + ' above ' + this.maxSpeed);
        }
        this.isScrolling = false;
        const oldPos = this.scrollPos;
        if (sx !== 0) {
            if (this.axis === 'X') {
                this.scrollPos += sx;
            }
        }
        if (sy !== 0) {
            if (this.axis !== 'X') {
                this.scrollPos += sy;
            }
        }
        if (this.pos + this.scrollPos > this.max) {
            this.scrollPos = this.max - this.pos;
        } else if (this.pos + this.scrollPos < this.min - this.bufferSpace) {
            this.scrollPos = this.min - this.pos - this.bufferSpace;
        }
        const scrolled = {x: (this.axis === 'X' ? this.scrollPos - oldPos : 0), y: (this.axis !== 'X' ? this.scrollPos - oldPos : 0)};
        scrolled.unscrolled = {x: sx - scrolled.x, y: sy - scrolled.y};

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        if (this.scrollPos >= 0 && this.scrollPos < this.bufferSpace) {
            this.state = 0;
        } else {
            if (this.state === 0)  {
                let startCopy = true;
                if (this.scrollPos < 0) {
                    this.bufferPos = this.pos - this.bufferSpace;
                    this.scrollJump = this.bufferSpace;
                    startCopy = (this.bufferPos > this.min);
                } else {
                    this.bufferPos = this.pos + this.bufferSpace;
                    this.scrollJump = -this.bufferSpace;
                }
                if (startCopy) {
                    this.state = 1;
                }
            }
        }
        return scrolled;
    }

    getPreview() {
        return {
            type: 'plane',
            texture: this.buffers.buffers[this.buffers.active].elem.toDataURL('image/png'),
            color: null,
            width: this.paneDim.x,
            height: this.paneDim.y
        }
    }

    getDependentModels() {
        return [
            this.spriteSheet
        ]
    }
}

const type = Pane.createType(
    {name: 'BitmapScrollPane'},
    BitmapScrollPane,
    BitmapScrollPaneConfig
)

export function BitmapScrollPane(...args) {
    return BitmapScrollPaneImpl.newInst(type, ...args)
}