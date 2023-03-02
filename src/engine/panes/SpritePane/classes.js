import inst from "core/instances"
import { ANIMATION } from "core/const"
import { BitmapPlayer, cloneDeep, d, isArray, toPairs, without } from "helper/helper"
import { RawAppliedImage } from "core/classes"
import { Model } from "core/model"

class SpriteSheet extends Model {

    constructor(input) {
        super(input)
    }

    assertSprite(id) {
        if (!this.sprites[id]) {
            throw Error('No sprite with id "' + id + '" found in spritesheet!');
        }
    }

    assertAnimation(id) {
        if (!this.animations[id]) {
            throw Error('No animation with id "' + id + '" found in spritesheet!');
        }
    }

    addTransformedSprite(id, base, transformers) {
    }

    addTransformedSprites(postfix, baseIds, transformers) {
    }

    addTransformedSpritesFromObj(transformers, obj) {
    }

    addTransformedAnimation(id, base, transformers, sync = false, speed = 1) {
        this.assertAnimation(base);
        const baseAnimation = this.animations[base];
        const newFrames = [];
        for (let i = 0; i < baseAnimation.frames.length; i++) {
            const frame = baseAnimation.frames[i];
            const newId = id + '_' + i;
            this.addTransformedSprite(newId, frame.id, transformers);
            newFrames.push({
                id: newId, duration: frame.duration, padding: {x: frame.padding.x, y: frame.padding.y}
            });
        }
        const animation = {
            sync,
            dim: {x: baseAnimation.dim.x, y: baseAnimation.dim.y},
            frames: newFrames,
            speed: speed,
            dir: baseAnimation.dir,
            end: baseAnimation.end
        };
        this.animations[id] = animation;
        if (sync) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed);
            this.players[id] = player;
        }
    }

    addSprite(name, offX, offY, width, height) {
    }

    addSpriteSeq(name, offX, offY, width, height, length, spacing = 0) {
    }

    addAnimation(name, frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD, sync = false, speed = 1) {
    }

    isAnimation(name) {
        return !(this.animations[name] === undefined);
    };

    getSpriteDim(name) {
        if (name === null) {
            return {x: 0, y: 0};
        }
        if (this.isAnimation(name)) {
            return this.animations[name].dim;
        }
        const sprite = this.getSprite(name);
        return sprite.dim;
    }

    getSprite(name) {
        this.assertSprite(name);
        return this.sprites[name];
    }

    loadAnimationToProxy(name, proxy) {
        this.assertAnimation(name);
        let animation = this.animations[name];
        if (animation.sync) {
            proxy.setPlayer(this.players[name]);
        } else {
            // creates a new player by lazy loading in the proxy
            proxy.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed);
        }
    }

    drawSprite(ctx, name, posX, posY, paddX = 0, paddY = 0) {
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        ctx.drawImage(
            this.sheet.canvas,
            // TODO remove: sprite.img === undefined ?
                // this.sheet.elem : sprite.img.elem,
            sprite.off.x, sprite.off.y,
            sprite.dim.x, sprite.dim.y,
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawFilteredSprite(ctx, name, filters, posX, posY, paddX = 0, paddY = 0) {
        if (filters === '') {
            return this.drawSprite(ctx, name, posX, posY, paddX, paddY);
        }
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        const transformed = inst.filterer.getCanvasWithFiltersApplied(
            filters,
            sprite.img === undefined ? this.sheet.canvasObj : sprite.img,
            sprite.off.x, sprite.off.y,
            draw.width, draw.height
        );
        ctx.drawImage(
            transformed[0].elem,
            transformed[1], transformed[2],
            transformed[3], transformed[4],
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawSpritePart(ctx, name, posX, posY, width, height, offX = 0, offY = 0) {
        const sprite = this.getSprite(name);
        width = Math.min(offX + sprite.dim.x, width);
        height = Math.min(offY + sprite.dim.y, height);
        if (width === 0 || height === 0) {
            return;
        }
        ctx.drawImage(
            this.sheet.canvas,
            // TODO remove: sprite.img === undefined ? this.sheet.elem : sprite.img.elem,
            sprite.off.x + offX, sprite.off.y + offY,
            width, height,
            posX, posY,
            width, height
        );
    };

    getDependentImages() {
        return [ this.sheet ]
    }

    addRebuildProps(obj, deep) {
        const rawSprites = {}
        const seq = {}
        for (const [ id, sprite ] of toPairs(this.sprites)) {
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
                const sprite = this.sprites[name + no]
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
                const sprite = cloneDeep(this.sprites[name + '1'])
                sprite.dim.x *= found.length
                sprite.off = off
                rawSprites[name] = sprite
            }
            const notFound = found.length <= 1 ? sprites : without(sprites, found)
            while (notFound.length) {
                const spriteId = notFound.pop()
                rawSprites[spriteId] = cloneDeep(this.sprites[spriteId])
            }
        }
        const { id2pos, ...rect } = this.config.minRectPositions(rawSprites)
        const sprites = {}
        const minImage = (new RawAppliedImage(this.sheet.id)).resize(rect.width, rect.height)
        for (const [ id, pos ] of toPairs(id2pos)) {
            const sprite = rawSprites[id]
            const dim = sprite.dim
            const offs = isArray(sprite.off) ? sprite.off : [sprite.off]
            const dimX = dim.x / offs.length
            let posX = pos.x
            for (const off of offs) {
                minImage.ctx.drawImage(
                    this.sheet.canvas,
                    off.x, off.y,
                    dimX, dim.y,
                    posX, pos.y,
                    dimX, dim.y
                )
                posX += dimX
            }
            sprite.off.x = pos.x
            sprite.off.y = pos.y
            const rect = [ pos.x, pos.y, dimX, sprite.dim.y ]
            if (offs.length > 1) {
                rect.push(offs.length)
            }
            sprites[id] = rect
        }
        const animations = {}
        for (const [ id, animation ] of toPairs(this.animations)) {
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
        obj.transforms = cloneDeep(this.transforms)
    }
}

export {
    SpriteSheet
}