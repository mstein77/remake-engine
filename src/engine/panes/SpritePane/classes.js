import inst from "core/instances"
import { ANIMATION } from "core/const"
import { BitmapPlayer, getConfigFromInput } from "helper/helper"

class SpriteSheet {

    constructor(input) {
        const config = getConfigFromInput(SpriteSheet.Config, input)
        config.applyTo(this)
        this.config = config

        this.sheet = this.image.getCanvas();
        this.sprites = {};
        this.animations = {};
        this.customImages = [];
        this.players = {};
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
        this.assertSprite(base);
        this.customImages.push({
            id,
            base,
            transformers
        });
    }

    addTransformedSprites(postfix, baseIds, transformers) {
        for (let id of baseIds) {
            this.addTransformedSprite(id + postfix, id, transformers);
        }
    }

    addTransformedSpritesFromObj(transformers, obj) {
        for (let target in obj) {
            this.addTransformedSprite(target, obj[target], transformers);
        }
    }

    addTransformedAnimation(id, base, transformers, synchronous = false, speed = 1) {
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
            synchronous,
            dim: {x: baseAnimation.dim.x, y: baseAnimation.dim.y},
            frames: newFrames,
            speed: speed,
            dir: baseAnimation.dir,
            end: baseAnimation.end
        };
        this.animations[id] = animation;
        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed);
            this.players[id] = player;
        }
    }

    build() {
        for (let image of this.customImages) {
            let base = this.getSprite(image.base);
            const trans = inst.filterer.getCanvasWithFiltersApplied(
                image.transformers,
                base.img ? base.img : this.sheet,
                base.off.x,
                base.off.y,
                base.dim.x,
                base.dim.y
            );
            const sprite = this.addSprite(image.id, 0, 0, base.dim.x, base.dim.y);
            sprite.img = trans[0];
        }
    }

    addSprite(name, offX, offY, width, height) {
        const sprite = {
            off: {x: offX, y: offY},
            dim: {x: width, y: height}
        };
        this.sprites[name] = sprite;
        return sprite;
    }

    addSpriteSeq(name, offX, offY, width, height, length, spacing = 0) {
        for (let i = 1; i <= length; i++) {
            this.addSprite(name + i, offX, offY, width, height);
            offX += width + spacing;
        }
    }

    addAnimation(name, frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD, synchronous = false, speed = 1) {
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

            const dim = this.getSpriteDim(frame.id);
            maxX = Math.max(maxX, dim.x);
            maxY = Math.max(maxY, dim.y);
            sameSize = sameSize && (maxX === dim.x || maxY === dim.y);
            dims.push(dim);
            frameDetails.push(frame);
        }

        const animation = {
            synchronous,
            dim: {x: maxX, y: maxY},
            frames: frameDetails,
            speed,
            dir,
            end
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

        this.animations[name] = animation;

        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, end, dir, speed);
            this.players[name] = player;
        }
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
        if (animation.synchronous) {
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
            sprite.img === undefined ?
                this.sheet.elem : sprite.img.elem,
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
            sprite.img === undefined ? this.sheet : sprite.img,
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
            sprite.img === undefined ? this.sheet.elem : sprite.img.elem,
            sprite.off.x + offX, sprite.off.y + offY,
            width, height,
            posX, posY,
            width, height
        );
    };
}

export {
    SpriteSheet
}