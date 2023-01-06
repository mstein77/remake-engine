import inst from "core/instances"
import { getCanvasForDim, getConfigFromInput } from "helper/helper"
import { DivContainer } from "core/classes"
import { LinearGradientPaneConfig } from "./config";

/**
 * TODO:
 *   - endless Scrolling
 *   - Use CSS Background-Property?
 */
export class LinearGradientPane {

    constructor(input) {
        const config = getConfigFromInput(LinearGradientPane.Config, input);
        config.applyTo(this);
        this.config = config;
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.isHorizontal = (this.axis === 'X');
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
        this.lowerBoundPos = 0;
        this.upperBoundPos = 0;
        this.viewPosition = 0;
        let totalSize = 0;
        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewSize = this.isHorizontal ? viewPortDimX : viewPortDimY;
        this.viewPositionMax = Math.max(totalSize - this.viewSize, 0);
        this.divPosition = 0;
        this.fadeDiv = document.createElement('div');
        this.fadeDiv.setAttribute(
            'style',
            'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortDimX + 'px; height: ' + viewPortDimY + 'px; top: 0px; left: 0px'
        );
        this.container = new DivContainer(this.fadeDiv);
        return this.container;
    }

    getGradient() {
        let currPos = 0;
        let currColorIndex = 0;

        while (currPos + this.colorStops[currColorIndex][1] <= this.viewPosition) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
        }
        const startIndex = currColorIndex;
        this.divPosition = currPos;

        const top = Math.abs(currPos - this.viewPosition);
        this.lowerBoundPos = currPos;
        this.upperBoundPos = currPos + this.colorStops[currColorIndex][1];

        const endPos = this.viewPosition + this.viewSize;
        while (currPos + this.colorStops[currColorIndex][1] <= endPos) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
            if (currColorIndex === this.colorStops.length) {
                currPos = endPos;
                break;
            }
        }
        let lastIndex = currColorIndex;
        const lastIndexPos =
            1 - this.viewSize + (currPos === endPos ? currPos : currPos + this.colorStops[currColorIndex][1]);
        this.upperBoundPos = Math.min(this.upperBoundPos, lastIndexPos);
        this.lowerBoundPos = Math.max(this.lowerBoundPos, currPos - this.viewSize);

        let bottom = 0;
        if (currPos !== endPos) {
            bottom = currPos + this.colorStops[currColorIndex][1] - endPos;
            lastIndex++;
        }

        let gradient = 'to ' + (this.isHorizontal ? 'right' : 'bottom');
        let pos = 0;
        for (let i = startIndex; i <= lastIndex; i++) {
            if (i === this.colorStops.length) {
                gradient += ', ' + this.colorStops[i - 1][0];
                break;
            }
            const stop = this.colorStops[i];
            gradient += ', ' + stop[0];
            if (pos > 0 && i < lastIndex) {
                gradient += ' ' + pos + 'px';
            }
            pos += stop[1];
        }
        return {
            top,
            bottom,
            css: gradient
        }
    }

    getPreview() {
        const gradient = this.getGradient();
        const canvas = getCanvasForDim(this.viewPortDim.x, this.viewPortDim.y);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const grd = ctx.createLinearGradient(0, 0,
            !this.isHorizontal ? 0 : canvas.width,
            !this.isHorizontal ? canvas.height : 0
        );
        const parts = gradient.css.split(', ');
        let pos = 0;
        const maxPos = this.isHorizontal ? canvas.width : canvas.height;
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const subParts = part.split(' ');
            pos = (subParts.length === 2) ? parseInt(subParts[1], 10) :
                (i === 1 ? 0 : maxPos);
            grd.addColorStop(pos / maxPos, subParts[0]);
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        return {
            type: 'plane',
            texture: canvas.toDataURL('image/png'),
            color: null,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }

    render() {
        const gradient = this.getGradient();
        const div = this.container.getChild();
        inst.game.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'width' : 'height'),
            (gradient.top + this.viewSize + gradient.bottom) + 'px'
        );
        inst.game.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'left' : 'top'),
            -gradient.top + 'px'
        );
        inst.game.addDomOp(
            div,
            'style.background',
            'linear-gradient(' + gradient.css + ')'
        );
        this.dirty = false;
    }

    scrollBy(speedX, speedY) {
        const speed = this.isHorizontal ? speedX : speedY;

        if (speed === 0) {
            return;
        }
        let newPos = this.viewPosition + speed;
        if (newPos > this.viewPositionMax) {
            newPos = this.viewPositionMax;
        } else if (newPos < 0) {
            newPos = 0;
        }

        if (this.viewPosition !== newPos) {
            this.viewPosition = newPos;
            if (newPos < this.lowerBoundPos || newPos > this.upperBoundPos) {
                this.dirty = true;
            } else {
                inst.game.addDomOp(
                    this.container.getChild(),
                    'style.' + (this.isHorizontal ? 'left' : 'top'),
                    (this.divPosition - newPos) + 'px'
                );
            }
        }
    }
}
LinearGradientPane.Config = LinearGradientPaneConfig