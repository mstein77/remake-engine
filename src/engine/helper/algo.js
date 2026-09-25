import { d } from "helper/helper"

const sortArrayIndexDesc = idx => (a, b) => a[idx] === b[idx] ? 0 : (a[idx] > b[idx] ? -1 : 1)

const sortArrayIndex1Desc = sortArrayIndexDesc(1)
const sortArrayIndex0Desc = sortArrayIndexDesc(0)

const sortArrayIndex1DescIndex0Desc = (a, b) => {
    const c = sortArrayIndex1Desc(a, b)
    if (c !== 0) return c
    return sortArrayIndex0Desc(a, b)
}

const minRectPositions = (rects, maxWidth = 1000) => {
    maxWidth = rects.reduce(
        (acc, curr) => Math.max(acc, curr[1]),
        maxWidth
    )
    rects.sort(sortArrayIndex1DescIndex0Desc)

    let spaceBlocks = [[0, 0, maxWidth, null]];
    let canvasWidth  = 0;
    let canvasHeight = 0;
    const id2pos = {};

    for (const [ width, height, id, index ] of rects) {
        let found = false
        const newBlocks = []
        for (const block of spaceBlocks) {
            if (found) {
                newBlocks.push(block)
                continue
            }
            const [ x, y, blockWidth, blockHeight ] = block
            if (blockHeight !== null && (blockWidth < width || blockHeight < height)) {
                newBlocks.push(block)
                continue
            }
            const pos = { x, y }
            if (index !== undefined) pos.index = index
            id2pos[id] = pos
            if (blockHeight === null) {
                if (blockWidth > width) {
                    newBlocks.push([ x + width, y, blockWidth - width, height ])
                }
                newBlocks.push([0, y + height, maxWidth, null])
            } else {
                if (blockWidth > width) {
                    newBlocks.push([ x + width, y, blockWidth - width, height ])
                }
                if (blockHeight > height) {
                    newBlocks.push([ x, y + height, blockWidth, blockHeight - height ])
                }
            }
            found = true
            canvasWidth = Math.max(x + width, canvasWidth)
            canvasHeight = Math.max(y + height, canvasHeight)
        }
        spaceBlocks = newBlocks
    }
    return {
        id2pos,
        width: canvasWidth,
        height: canvasHeight
    }
}

export {
    minRectPositions
}