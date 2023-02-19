import { COLLISION } from "core/const"
import { BufferedCanvasContainer, PlayerProxy } from "core/classes"
import { SpritePaneConfig } from "./config"
import { d } from "helper/helper"
import { Pane } from "../classes"
import inst from "core/instances"

export class SpritePane extends Pane {

    constructor(input) {
        super(input)
        this.actorId = null;
        this.groups = {};
        this.bufferClearRects = {
            0: [],
            1: []
        };
        this.test = {}
        this.uid = 0;
        this.zOrdering = false;
        this.attachDefault = null;
        this.collisions = {};
        this.posSort = function (x, y) {
            if (x.pos < y.pos) {
                return -1;
            } else if (x.pos > y.pos) {
                return 1;
            }
            return 0;
        }
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.totalPixels = viewPortDimX * viewPortDimY;
        this.pixelLimit = Math.round(this.totalPixels * 0.25);

        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.container = new BufferedCanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    getAxisPointCollisions(sprites, axis, detailed = false) {
        const axisPoints = [];
        for (let key in sprites) {
            const sprite = sprites[key];
            if (sprite.noCollision === true) {
                continue;
            }
            axisPoints.push({
                sprite,
                isStart: true,
                key,
                pos: sprite[axis]
            });
            axisPoints.push({
                sprite,
                isStart: false,
                key,
                pos: (sprite[axis] + sprite.dim[axis] - 1)
            });
        }

        axisPoints.sort(this.posSort);

        let i = 0;
        let pos = null;
        const opening = [];
        let closing = [];
        const found = detailed ? [] : {};

        do {
            if (i === axisPoints.length || axisPoints[i].pos !== pos) {
                for (let o of opening) {
                    for (let c of closing) {
                        if (o !== c) {
                            if (detailed) {
                                found.push([o, c]);
                                found.push([c, o]);
                            } else {
                                found[o.id] = o;
                                found[c.id] = c;
                            }
                        }
                    }
                }
                if (i === axisPoints.length) {
                    break;
                }

                for (let c of closing) {
                    const posClose = opening.indexOf(c);
                    opening.splice(posClose, 1);
                }
                closing = [];
            }
            let point = axisPoints[i];
            pos = point.pos;
            if (point.isStart) {
                opening.push(point.sprite)
            } else {
                closing.push(point.sprite)
            }
            i++
        } while (true);

        return found;
    }

    updateCollisions() {
        const firstDim = (this.paneDim.x > this.paneDim.y ? 'x' : 'y');
        const secondaryDim = firstDim === 'x' ? 'y' : 'x';
        let found = this.getAxisPointCollisions(this.sprites, firstDim);
        found = this.getAxisPointCollisions(found, secondaryDim, true);

        const collisions = {};
        for (let pair of found) {

            const source = pair[0];
            const target = pair[1];
            if (collisions[source.id] === undefined) {
                collisions[source.id] = [];
            }

            let sourceEnd = source.x + source.dim.x - 1;
            let targetEnd = target.x + target.dim.x - 1;
            let touch = 0;
            let type;
            const collision = {sprite: target};
            if (source.x < target.x) {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.COVER;
                    touch = targetEnd - target.x + 1;
                } else {
                    type = COLLISION.LEFT;
                    touch = sourceEnd - target.x + 1;
                }
            } else {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.RIGHT;
                    touch = targetEnd - source.x + 1;
                } else {
                    type = COLLISION.INCLUDE;
                    touch = sourceEnd - source.x + 1;
                }
            }
            if (touch <= 0) {
                continue;
            }
            collision.x = {type, touch};

            sourceEnd = source.y + source.dim.y - 1;
            targetEnd = target.y + target.dim.y - 1;
            if (source.y < target.y) {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.COVER;
                    touch = targetEnd - target.y + 1;
                } else {
                    type = COLLISION.TOP;
                    touch = sourceEnd - target.y + 1;
                }
            } else {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.BOTTOM;
                    touch = targetEnd - source.y + 1;
                } else {
                    type = COLLISION.INCLUDE;
                    touch = sourceEnd - source.y + 1;
                }
            }
            if (touch <= 0) {
                continue;
            }
            collision.y = {type, touch};

            collisions[source.id].push(collision);
        }
        this.collisions = collisions;
    }

    getLastSpriteCollisions(id) {
        if (this.collisions[id] === undefined) {
            return [];
        }
        return this.collisions[id];
    }

    setAttachDefault(value) {
        this.attachDefault = value;
    }

    setActorId(id) {
        if (!this.sprites[id]) {
            throw Error('Sprite Actor "' + id + "' not found!");
        }
        this.actorId = id;
    }

    getActorId() {
        return this.actorId;
    }

    hasSprite(id) {
        return (this.sprites[id] !== undefined);
    }

    isAxisCollide(aStart, aEnd, bStart, bEnd) {
        return !(aStart > bEnd || bStart > aEnd);
    }

    getActorCollision(id = null) {
        const actorId = this.getActorId();
        if (actorId === null) {
            return false;
        }

        if (id === null) {
            const actorCollisions = this.getLastSpriteCollisions(actorId);
            return actorCollisions.length > 0 ? actorCollisions : null;
        }
        const colls = this.getLastSpriteCollisions(id);
        for (let coll of colls) {
            if (coll.sprite.id === actorId) {
                return coll;
            }
        }
        return null;
    }

    isCollidingActor(id) {
        const actorId = this.getActorId();
        if (actorId === null) {
            return false;
        }
        const colls = this.getLastSpriteCollisions(id);
        for (let coll of colls) {
            if (coll.sprite.id === actorId) {
                return true;
            }
        }
        return false;
    }

    addSprite(id, name,  x = 0, y = 0, z = 0) {
        if (!this.zOrdering && z !== 0) {
            this.zOrdering = true;
        }
        const sprite = {id, x, y, z, noCollision: false, animSpeed: 1, filterDuration: -1, attached: this.attachDefault, filters: '', hidden: false};
        this.sprites[id] = this.initSpriteObj(sprite, name);
        this.dirty = true;
    }

    setNoCollision(id, value) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.noCollision = value;
        }
    }

    hideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === false;
            }
            sprite.hidden = true;
        }
    }

    unhideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === true;
            }
            sprite.hidden = false;
        }
    }

    toggleSpriteVisiblity(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.hidden = !sprite.hidden;
            this.dirty = true;
        }
    }

    isHidden(id) {
        const sprite = this.getSprite(id);
        return sprite.hidden;
    }

    hasSprite(id) {
        return !(this.sprites[id] === undefined);
    }

    setAnimationSpeed(id, speed) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.animSpeed = speed;
            if (sprite.isAnimation) {
                sprite.animation.setSpeed(speed);
            }
        }
    }

    getSpritesById(id) {
        return id[0] === ':' ? this.getGroupSprites(id) : [this.getSprite(id)];
    }

    getSprite(id) {
        return this.sprites[id];
    }

    initSpriteObj(obj, sheetId) {
        const isAni = sheetId !== null && this.spriteSheet.isAnimation(sheetId);
        obj.name = sheetId;
        obj.isAnimation = isAni;
        obj.dim = this.spriteSheet.getSpriteDim(sheetId);
        if (isAni) {
            if (obj.animation === undefined) {
                obj.animation = new PlayerProxy();
            }
            this.spriteSheet.loadAnimationToProxy(sheetId, obj.animation);
            obj.animation.setSpeed(obj.animSpeed);
        }
        return obj;
    }

    assignSprite(id, sheetId, alignStrategy = false) {
        const sprite = this.sprites[id];
        const oldDim = alignStrategy === true ? sprite.dim : null;
        this.initSpriteObj(sprite, sheetId);
        if (oldDim !== null && (oldDim.y !== sprite.dim.y || oldDim.x !== sprite.dim.x)) {
            // @TODO implement different strategies
            this.setSpriteBottomPos(id, sprite.x, sprite.y + oldDim.y - 1);
        }
        this.dirty = true;
    }

    hasSpriteSheetId(id, sheetId) {
        const sprite = this.sprites[id];
        return (sprite.name === sheetId);
    }

    getSpriteSheetId(id) {
        const sprite = this.sprites[id];
        return sprite.name;
    }

    updateFrames() {
        const synced = [];
        for (let id in this.sprites) {
            const sprite = this.sprites[id];
            if (sprite.filterDuration !== -1) {
                if (sprite.filterDuration === 0) {
                    sprite.filters = '';
                    if (!sprite.hidden) {
                        this.dirty = true;
                    }
                }
                sprite.filterDuration--;
            }
            if (sprite.isAnimation) {
                const ani = sprite.animation;
                if (ani.isSynchronous()) {
                    if (synced.indexOf(sprite.name) === -1) {
                        ani.nextStep();
                        synced.push(sprite.name);
                    } else {
                        continue;
                    }
                } else {
                    ani.nextStep();
                }
                if (!this.dirty && ani.isDirty()) {
                    this.dirty = true;
                }
            }
        }
    }

    getSpritePos(id, xEnd = false, yEnd = false) {
        const sprite = this.sprites[id];
        let x = sprite.x;
        if (xEnd) {
            x += sprite.dim.x - 1;
        }
        let y = sprite.y;
        if (yEnd) {
            y += sprite.dim.y - 1;
        }
        return {id, x, y, z: sprite.z, dim: sprite.dim};
    }

    getAllSpritePos(match) {
        const result = [];
        const matchLen = match.length;
        for(let sprite in this.sprites) {
            if (sprite.substr(0, matchLen) === match) {
                result.push(this.sprites[sprite]);
            }
        }
        return result;
    }

    getUid(name) {
        this.uid++;
        return name + '.' + this.uid;
    }

    removeSprites(ids) {
        for (let id of ids) {
            this.removeSprite(id);
        }
    }

    removeSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (sprite) {
                delete this.sprites[sprite.id];
                this.dirty = true;
            }
        }
    }

    moveSpritesAttachedTo(attached, moveX, moveY) {
        for(let id in this.sprites) {
            const sprite = this.sprites[id];
            if (attached === sprite.attached) {
                this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
            }
        }
    }

    isSpriteInBounds(id, top = 0, bottom = 0, left = 0, right = 0) {
        const pos = this.getSpritePos(id);
        return (
            pos.x + pos.dim.x >= left && pos.x < (this.viewPortDim.x + right) &&
            pos.y + pos.dim.y >= top && pos.y < (this.viewPortDim.y + bottom)
        );
    }

    attachSpriteTo(id, attach) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.attached = attach;
        }
    }

    setSpritePos(id, x, y, z = null, xEnd = false, yEnd = false) {
        const sprite = this.sprites[id];
        if (xEnd) {
            x -= sprite.dim.x - 1;
        }
        if (yEnd) {
            y -= sprite.dim.y - 1;
        }
        if (!this.dirty) {
            this.dirty = (sprite.x !== x || sprite.y !== y);
        }
        sprite.x = x;
        sprite.y = y;
        if (z !== null) {
            this.zOrdering = true;
            if (!this.dirty) {
                this.dirty = sprite.z !== z;
            }
            sprite.z = z;
        }
    }

    setSpriteBottomPos(id, x, y, z = null) {
        this.setSpritePos(id, x, y, z, false, true);
    }

    addGroup(id, spriteIds) {
        this.groups[':' + id] = spriteIds;
    }

    deleteGroup(id) {
        delete this.groups[':' + id];
    }

    getGroupSprites(id) {
        const result = [];
        if (this.groups[id]) {
            for (let sprite of this.groups[id]) {
                if (this.hasSprite(sprite)) {
                    result.push(this.getSprite(sprite));
                }
            }
        }
        return result;
    }

    setSpriteFilters(id, filters, duration = -1) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.filters = filters;
            sprite.filterDuration = duration;
        }
        this.dirty = true;
    }

    moveSprite(id, moveX, moveY) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
        }
    }

    render() {
        const target = this.container.getBufferCtx();
        const clearRects = this.bufferClearRects[this.container.getActiveIndex()];
        if (clearRects.length === 0) {
            target.clearRect(0, 0, this.paneDim.x, this.paneDim.y);
        } else {
            for (let rect of clearRects) {
                target.clearRect(rect.x, rect.y, rect.width, rect.height);
            }
        }

        const drawRects = [];
        let pixels = 0;

        const ids = Object.keys(this.sprites);
        if (this.zOrdering) {
            ids.sort((id1, id2) => {
                const z1 = this.sprites[id1].z;
                const z2 = this.sprites[id2].z;
                if (z1 < z2) {
                    return -1;
                } else if (z1 > z2) {
                    return 1;
                }
                return 0;
            });
        }

        for (let id of ids) {
            const sprite = this.sprites[id];
            if (sprite.name !== null && !sprite.hidden && sprite.x < this.paneDim.x && sprite.x > -sprite.dim.x && sprite.y < this.paneDim.y && sprite.y > -sprite.dim.y) {
                let clearRect;
                if (sprite.isAnimation) {
                    const frameSprite = sprite.animation.getFrame();
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, frameSprite.id, sprite.filters, sprite.x, sprite.y, frameSprite.padding.x, frameSprite.padding.y, sprite.filters
                    )
                } else {
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, sprite.name, sprite.filters, sprite.x, sprite.y, 0, 0, sprite.filters
                    )
                }
                drawRects.push(clearRect)
                pixels += clearRect.width * clearRect.height
            }
        }
        this.bufferClearRects[this.container.getActiveIndex()] = (pixels <= this.pixelLimit) ? drawRects : []
        this.container.switchBuffer()
        this.dirty = false
    }

    getPreview() {
        return {
            type: 'plane',
            texture: this.container.buffers[this.container.active].elem.toDataURL('image/png'),
            color: null,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }

    getEditorResources() {
        const resources = super.getEditorResources()
        resources.props.sprites = this.spriteSheet.sprites
        resources.props.animations = this.spriteSheet.animations
        return resources
    }
}
SpritePaneConfig.linkTo(SpritePane)

inst.paneRegistry.add('SpritePane', SpritePane, {editable: true})