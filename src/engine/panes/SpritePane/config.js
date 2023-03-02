import { Config } from "core/config"
import { SpriteSheet } from "./classes"
import { d, isArray, isString, BitmapPlayer, cloneDeep, without, toPairs } from "helper/helper"
import { validated } from "helper/validate"
import { AppliedImage, RawAppliedImage } from "core/classes"
import inst from "core/instances"
import { minRectPositions } from "helper/algo"

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
            sync,
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
                sprite.off.x = pos.x
                sprite.off.y = pos.y
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
        return minRectPositions(
            toPairs(id2elem).map(
                ([ id, elem ]) => [ elem.dim.x, elem.dim.y, id ]
            )
        )
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
}

export {
    SpriteSheetConfig,
    SpritePaneConfig
}