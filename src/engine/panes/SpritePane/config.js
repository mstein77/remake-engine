import { Config } from "core/config"
import { SpriteSheet } from "./classes"
import { d, isArray, isString, BitmapPlayer, cloneDeep, without, toPairs } from "helper/helper"
import { validated } from "helper/validate"
import { AppliedImage, RawAppliedImage } from "core/classes"
import inst from "core/instances"

class SpriteSheetConfig extends Config {

    getFieldProps() {
        return {
            dim: {min: 1, max: 9999},
            pos: {min: 0, max: 9999}
        }
    }

    getDefaults() {
        return {
            image: undefined,
            sprites: {},
            transforms: [],
            animations: {}
        }
    }

    validateRectObject(value) {
        validated.object(value, {keys: ['x', 'y', 'width', 'height']})
        return [
            validated.int(value.x, this.getFieldProp('pos')),
            validated.int(value.y, this.getFieldProp('pos')),
            validated.int(value.width, this.getFieldProp('dim')),
            validated.int(value.height, this.getFieldProp('dim'))
        ]
    }

    validateRectArray(value) {
        const [ x, y, width, height, repeat, dist ] = value
        const result = [
            validated.int(x, this.getFieldProp('pos')),
            validated.int(y, this.getFieldProp('pos')),
            validated.int(width, this.getFieldProp('dim')),
            validated.int(height, this.getFieldProp('dim')),
        ]
        if (value.length >= 5) {
            result.push(validated.int(repeat, this.getFieldProp({min: 1, max: 999})))
        }
        if (value.length > 5) {
            result.push(validated.int(dist, this.getFieldProp({min: 1, max: 999})))
        }
        return result
    }

    setSprite(id, rect) {
        this.sprites[id] = isArray(rect) ? this.validateRectArray(rect) : this.validateRectObject(rect)
    }

    setSprites(value) {
        validated.object(value)
        this.sprites = {}
        for (const [ id, sprite ] of toPairs(value)) {
            this.setSprite(id, sprite)
        }
    }

    validateTransform(value) {
        validated.object(value, {keys: ['name', 'filter', 'idModifier']})
        validated.string(value.name)
        validated.string(value.filter)
        validated.string(value.idModifier)

        return cloneDeep(value)
    }

    setTransform(value) {
        this.transforms.push(this.validateTransform(value))
    }

    setTransforms(value) {
        validated.array(value)
        this.transforms = []
        for (const transform of value) {
            this.setTransform(transform)
        }
    }

    validateAnimation(frames) {
        validated.object(frames, {keys: ['frames']})
        return cloneDeep(frames)
    }

    setAnimation(id, frames) {
        this.animations[id] = this.validateAnimation(frames)
    }

    setAnimations(value) {
        this.animations = {}
        for (const [ id, animation ] of toPairs(value)) {
            this.setAnimation(id, animation)
        }
    }

    setImage(value) {
        this.image = validated.imageResource(value)
    }

    applyAnimation({ speed, frames, end, dir, sync, transforms }, sprites) {
        let maxX = 0;
        let maxY = 0;
        let sameSize = true;
        let dims = [];
        const frameDetails = [];
        for (let rawFrame of frames) {
            const frame = (typeof rawFrame === 'string' || rawFrame instanceof String) ?
                {
                    duration: 1,
                    id: rawFrame,
                    padding: {x: 0, y: 0}
                } : rawFrame;

            if (!sprites[frame.id]) throw Error(`Unknown sprite "${frame.id}" given in animation`)

            const dim = sprites[frame.id].dim
            maxX = Math.max(maxX, dim.x);
            maxY = Math.max(maxY, dim.y);
            sameSize = sameSize && (maxX === dim.x || maxY === dim.y);
            dims.push(dim);
            frameDetails.push(frame);
        }

        const animation = {
            sync: sync,
            dim: {x: maxX, y: maxY},
            frames: frameDetails,
            speed,
            dir,
            end,
            transforms
        };

        if (!sameSize) {
            for (let i = 0; i < dims.length; i++) {
                const frame = animation.frames[i];
                const dim = dims[i];
                // TODO multiple auto padding strategies per axis
                // (V-CENTERING, V-TOP, V-BOTTOM, H-CENTERING, H-LEFT, H-RIGHT)
                const offX = (maxX - dim.x) >> 1;
                const offY = (maxY - dim.y) >> 1;
                frame.padding = {x: offX, y: offY};
            }
        }
        return animation
    }

    getModifiedId(value, name, id) {
        switch(value) {
            case 'append':
                return id + '-' + name

            case 'prepend':
                return name + '-' + id
        }
        return value.replace('$', id)
    }

    applyPropsTo(obj) {
        const rawSprites = {}

        // add base sprites and sprite sequences
        for (const [ id, rect ] of toPairs(this.sprites)) {
            const append = (rect.length > 4)
            let [ x, y, width, height, num = 1, gap = 0 ] = rect
            let no = 0
            while (++no <= num) {
                rawSprites[id + (append ? '' + no : '')] = {off: {x, y}, dim: {x: width, y: height}}
                x += gap + width
            }
        }
        const rawAnimations = cloneDeep(this.animations)
        const transforms = cloneDeep(this.transforms)

        const image = new AppliedImage(this.image)

        let sheet = image
        if (transforms.length) {

            // do transformations
            let idx = 0
            const transImages = {}
            const canvasObj = image.canvasObj
            for (const { name, filter, idModifier, sprites = [], animations = [] } of transforms) {

                for (const animationId of animations) {
                    const animation = rawAnimations[animationId]
                    if (!animation)
                        throw Error(`Unknown animation id "${animationId}" given in transformation "${name}" at index ${idx}`)

                    const { frames, base = animationId, ...props } = animation
                    const newFrames = []
                    for (const frameObj of frames) {
                        const frame = isString(frameObj) ? frameObj : frameObj.id
                        const newFrame = this.getModifiedId(idModifier, name, frame)
                        newFrames.push(isString(frameObj) ? newFrame : { ...cloneDeep(frameObj), id: newFrame })

                        if (sprites.includes(frame)) continue
                        sprites.push(frame)
                    }
                    if (!props.transforms) props.transforms = []
                    props.transforms.push(idx)
                    rawAnimations[this.getModifiedId(idModifier, name, animationId)] = {
                        frames: newFrames, base, ...props
                    }
                }

                for (const spriteId of sprites) {
                    const sprite = rawSprites[spriteId]
                    if (!sprite)
                        throw Error(`Unknown sprite id "${spriteId}" given in transformation "${name}" with index ${idx}`)

                    const newId = this.getModifiedId(idModifier, name, spriteId)
                    if (newId in rawSprites) continue

                    const { base = spriteId, ...props } = sprite

                    const trans = inst.filterer.getCanvasWithFiltersApplied(
                        filter,
                        sprite.transforms ? transImages[spriteId] : canvasObj,
                        sprite.off.x, sprite.off.y,
                        sprite.dim.x, sprite.dim.y
                    )
                    transImages[newId] = trans[0]

                    if (!props.transforms) props.transforms = []
                    props.transforms.push(idx)

                    props.off = {x: 0, y: 0}

                    rawSprites[newId] = { base, ...props }
                }
                idx++
            }

            // calc new positions for rawSprites in sheet
            const { id2pos, ...rect } = this.minRectPositions(rawSprites)

            // draw at new positions
            sheet = (new RawAppliedImage(this.image.id)).resize(rect.width, rect.height)
            for (const [ id, pos ] of toPairs(id2pos)) {
                const sprite = rawSprites[id]
                const dim = sprite.dim
                const offs = isArray(sprite.off) ? sprite.off : [sprite.off]
                const dimX = dim.x / offs.length
                let posX = pos.x
                for (const off of offs) {
                    sheet.ctx.drawImage(
                        sprite.transforms ? transImages[id].elem : image.canvas,
                        off.x, off.y,
                        dimX, dim.y,
                        posX, pos.y,
                        dimX, dim.y
                    )
                    posX += dimX
                }
                sprite.off = pos
            }
        }

        const players = {}
        const animations = {}
        for (const [ id, animation ] of toPairs(rawAnimations)) {
            animations[id] = this.applyAnimation(animation, rawSprites)
            if (!animation.sync) continue

            const player = new BitmapPlayer()
            player.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed)
            players[id] = player
        }
        obj.players = players
        obj.sprites = rawSprites
        obj.sheet = sheet
        obj.animations = animations
        obj.transforms = transforms
    }

    minRectPositions(id2elem) {
        let maxWidth =  1000
        const items = []
        for (const [ id, elem ] of toPairs(id2elem)) {
            const { x, y } = elem.dim
            maxWidth = Math.max(maxWidth, x)
            items.push([ x, y, id ])
        }

        const compCompare = (idx, a, b) => a[idx] === b[idx] ? 0 : (a[idx] > b[idx] ? -1 : 1)

        items.sort((a, b) => {
            const c = compCompare(1, a, b)
            if (c !== 0) return c
            return compCompare(0, a, b)
        })

        let spaceBlocks = [[0, 0, maxWidth, null]];
        let canvasWidth  = 0;
        let canvasHeight = 0;
        const id2pos = {};

        for (const [ width, height, id ] of items) {
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
                id2pos[id] = { x, y }
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

    getDependentImages(model) {
        return [ model.sheet ]
    }

    addRebuildProps(obj, deep, base) {
        const rawSprites = {}
        const seq = {}
        for (const [ id, sprite ] of toPairs(base.sprites)) {
            if (sprite.transforms) continue
            const matches = id.match(/^(.*[^0-9])([0-9])+$/)
            if (matches !== null) {
                const [, name, no] = matches
                if (!seq[name]) seq[name] = []
                seq[name].push(id)
            } else {
                rawSprites[id] = cloneDeep(sprite)
            }
        }
        for (const [ name, sprites ] of toPairs(seq)) {
            let no = 1
            const found = []
            const off = []
            let compDim = null
            while (sprites.includes(name + no)) {
                const sprite = base.sprites[name + no]
                if (compDim) {
                    const dim = sprite.dim
                    if (compDim.x !== dim.x || compDim.y !== dim.y) {
                        no++
                        continue
                    }
                } else {
                    compDim = sprite.dim
                }
                found.push(name + no)
                off.push(sprite.off)
                no++
            }
            if (found.length > 1) {
                const sprite = cloneDeep(base.sprites[name + '1'])
                sprite.dim.x *= found.length
                sprite.off = off
                rawSprites[name] = sprite
            }
            const notFound = found.length <= 1 ? sprites : without(sprites, found)
            while (notFound.length) {
                const spriteId = notFound.pop()
                rawSprites[spriteId] = cloneDeep(base.sprites[spriteId])
            }
        }
        const { id2pos, ...rect } = this.minRectPositions(rawSprites)
        const sprites = {}
        const minImage = (new RawAppliedImage(base.sheet.id)).resize(rect.width, rect.height)
        for (const [ id, pos ] of toPairs(id2pos)) {
            const sprite = rawSprites[id]
            const dim = sprite.dim
            const offs = isArray(sprite.off) ? sprite.off : [sprite.off]
            const dimX = dim.x / offs.length
            let posX = pos.x
            for (const off of offs) {
                minImage.ctx.drawImage(
                    base.sheet.canvas,
                    off.x, off.y,
                    dimX, dim.y,
                    posX, pos.y,
                    dimX, dim.y
                )
                posX += dimX
            }
            sprite.off = pos
            const rect = [ pos.x, pos.y, dimX, sprite.dim.y ]
            if (offs.length > 1) {
                rect.push(offs.length)
            }
            sprites[id] = rect
        }
        const animations = {}
        for (const [ id, animation ] of toPairs(base.animations)) {
            if (animation.transforms) continue
            const { frames, end, dir, speed } = animation
            const newFrames = []
            for (const frameObj of frames) {
                const { id, duration, padding } = frameObj
                newFrames.push(
                    (duration === 1 && padding.x === 0 && padding.y === 0) ?
                        id : cloneDeep(frameObj)
                )
            }
            animations[id] =
                { frames: newFrames, end, dir, speed }
        }
        obj.image = this.getRebuildImage(minImage, deep)
        obj.sprites = sprites
        obj.animations = animations
        obj.transforms = cloneDeep(base.transforms)
    }
}
SpriteSheetConfig.linkTo(SpriteSheet)

class SpritePaneConfig extends Config {

    getDefaults() {
        return {
            spriteSheet: undefined,
            sprites: {}
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
    }

    setSpriteSheet(value) {
        this.spriteSheet = validated.config(SpriteSheet, value)
    }

    setSprites(value) {
        this.sprites = validated.object(value)
    }

    getDependentModels(model) {
        return [
            model.spriteSheet
        ]
    }

    addRebuildProps(obj, deep, base) {
        obj.spriteSheet = this.getRebuildModel(base.spriteSheet, deep)
        obj.sprites = {}
            // cloneDeep(base.sprites)
    }
}

export {
    SpriteSheetConfig,
    SpritePaneConfig
}