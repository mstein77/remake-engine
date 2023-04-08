import { CellValue, EntityIndex } from "editor/classes"
import { drawCanvasToAvail, getCanvasForIndexMatrix, getCanvasForDim } from "helper/helper"
import { IndexGrid } from "editor/classes/Grid"

class TileIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.sizeX = model.tileSize;
        this.sizeY = model.tileSize;
        this.img = model.tilesImg;

        this.tilesX = Math.floor(this.img.width/this.sizeX);
        if (model.count !== null) {
            this.tilesX = Math.min(this.tilesX, model.count);
        }
        this.tilesY = Math.floor(this.img.height/this.sizeY);
        if (model.count !== null) {
            this.tilesY = Math.min(this.tilesY, Math.ceil(model.count/this.tilesX));
        }

        // we could analyse how many empty tiles are at the end
        this.count = model.count !== null ? model.count : this.tilesX * this.tilesY;
        this.items = this.getAllIndices();
        this.valueIndexing = true;
    }

    notify() {
        this.model.count = this.getLength();
        this.count = this.model.count;
        return super.notify();
    }

    getInsertPlan(insertIndex, objects, preserve) {
        const count = objects.length;
        let value = insertIndex === undefined ? this.items.length : insertIndex;
        for (let object of objects) {
            object.index = value;
            object.value = value;
            value++;
        }

        const changes = [];
        const old2new = {};
        let mapChanges = [];
        const brushChanges = {};
        const propChanges = [];
        const frameIdChanges = [];

        if (insertIndex < this.items.length) {
            let index = this.items.length - 1;
            while (index >= insertIndex) {
                changes.push([index, index + count]);
                old2new[index] = index + count;
                index--;
            }

            if (preserve) {
                mapChanges = getMapChanges(this.model.map, old2new);

                for (let [key, brush] of Object.entries(this.model.brushes)) {
                    const changes = getMapChanges(brush, old2new);
                    if (changes.length > 0) {
                        brushChanges[key] = changes;
                    }
                }

                for (let [key, obj] of Object.entries(this.model.tiles)) {
                    if (obj.index !== undefined) {
                        const target = old2new[obj.index];
                        if (target !== undefined) {
                            propChanges.push([key, obj.index, target === null ? 0 : target]);
                        }
                    }
                }

                for (let [animation, obj] of Object.entries(this.model.animations)) {
                    for (let i = 0; i < obj.frames.length; i++) {
                        const frame = obj.frames[i];
                        const target = old2new[frame.id];
                        frameIdChanges.push(
                            [animation, i, frame.id, target]
                        );
                    }
                }
            }
        }

        return {
            changes,
            old2new,
            mapChanges,
            brushChanges,
            propChanges,
            frameIdChanges,
            count,
            objects,
            selectionChanges: null
        }
    }

    doInsertPlan(plan, selection) {
        const length = this.items.length + plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const new2old = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            new2old[target] = old;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const old = new2old[i];
            if (old !== undefined) {
                this.drawEntity(ctx, old, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[3];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }

        let selectionChanges = null;
        if (selection !== null && selection.getCellValue() === CellValue.tile &&
            selection.getType() !== 'entity') {
            const cells = selection.getCells();
            selectionChanges = {
                ref: selection,
                changes: getMapChanges(cells, plan.old2new)
            };
            for (let item of selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[3];
            }
        }
        plan.selectionChanges = selectionChanges;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[2]
        }

        // 5. animationChanges
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[3];
        }

        i = plan.changes.length - 1;
        while (i > 0) {
            const item = plan.changes[i];
            const target = item[1];
            if (target !== null) {
                const old = this.model.tiles[item[0]];
                if (old === undefined) {
                    delete this.model.tiles[target];
                } else {
                    this.model.tiles[target] = old;
                }
            }
            i--;
        }

        // entity-changes:
        while (this.items.length < length) {
            this.items.push(this.items.length);
        }

        this.model.count = plan.count;
        this.model.tilesImg.canvas = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        this.setEntityObjects(plan.objects, true);
    }

    undoInsertPlan(plan, selection) {
        const length = this.items.length - plan.count;

        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const old2new = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            old2new[old] = target;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const target = old2new[i];
            if (target !== undefined) {
                this.drawEntity(ctx, target, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[2];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }

        // selection changes
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            for (let item of plan.selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[2];
            }
        }

        for (let item of plan.changes) {
            const target = item[1];
            if (this.model.tiles[target] !== undefined) {
                this.model.tiles[item[0]] = this.model.tiles[target];
            } else {
                delete this.model.tiles[item[0]];
            }
        }

        while(this.items.length > length) {
            const index = this.items.pop();
            delete this.model.tiles[index];
        }

        this.model.count = length;
        this.model.tilesImg.elem = canvas;
        this.img.canvas = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[1]
        }

        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    getDeletePlan(indices, safe, selection = null) {
        const avail = [];
        indices.sort();
        const backupTiles = {};
        for (let index of indices) {
            if (this.hasIndex(index)) {
                avail.push(index);
                backupTiles[index] = this.getEntityObject(index);
            }
        }
        let left = avail.length;
        let index = this.items.length - 1;
        let count = 0;
        const changes = [];

        // [old, new|null]
        while(left > 0 && index >= 0) {
            if (!avail.includes(index)) {
                changes.push([index, index - left]);
            } else {
                count++;
                changes.push([index, null]);
                left--;
            }
            index--;
        }

        const old2new = {};
        if (safe) {
            for (let change of changes) {
                old2new[change[0]] = change[1];
            }
        } else {
            index = this.items.length - count;
            while (index < this.items.length) {
                old2new[index] = null;
                index++;
            }
        }

        const mapChanges = getMapChanges(this.model.map, old2new);

        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }

        const propChanges = [];
        for (let [key, obj] of Object.entries(this.model.tiles)) {
            if (obj.index !== undefined) {
                const target = old2new[obj.index];
                if (target !== undefined) {
                    propChanges.push([key, obj.index, target === null ? 0 : target]);
                }
            }
        }

        const frameBackup = {};
        const frameIdChanges = [];
        for (let [animation, obj] of Object.entries(this.model.animations)) {
            for (let i = 0; i < obj.frames.length; i++) {
                const frame = obj.frames[i];
                const target = old2new[frame.id];
                if (target === undefined) continue;

                if (target === null) {
                    if (frameBackup[animation] === undefined) {
                        frameBackup[animation] = [];
                    }
                    frameBackup[animation].push([
                        i, frame
                    ]);
                } else {
                    frameIdChanges.push(
                        [animation, i, frame.id, target]
                    );
                }
            }
        }

        return {
            safe,
            count,
            changes,
            old2new,
            backupTiles,
            mapChanges,
            brushChanges,
            propChanges,
            frameBackup,
            frameIdChanges,
            selectionChanges: null
        };
    }

    doDeletePlan(plan, selection) {
        const length = this.items.length - plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const new2old = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            if (target !== null) {
                new2old[target] = old;
            }
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const old = new2old[i];
            if (old !== undefined) {
                this.drawEntity(ctx, old, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[3];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }

        // selection changes

        let selectionChanges = null;
        if (selection !== null && selection.getCellValue() === CellValue.tile &&
            selection.getType() !== 'entity') {
            const cells = selection.getCells();
            selectionChanges = {
                ref: selection,
                changes: getMapChanges(cells, plan.old2new)
            };
            for (let item of selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[3];
            }
        }
        plan.selectionChanges = selectionChanges;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[2]
        }

        // 5. animationChanges
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[3];
        }

        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const ids = [];
            for (let item of frames) {
                ids.push(item[0]);
            }
            const currAnimation = this.model.animations[animation];
            const newFrames = [];
            let i = 0;

            while (i < currAnimation.frames.length) {
                if (!ids.includes(i)) {
                    newFrames.push(currAnimation.frames[i]);
                }
                i++;
            }
            currAnimation.frames = newFrames;
        }

        // 5. tileChanges
        i = plan.changes.length - 1;
        while (i > 0) {
            const item = plan.changes[i];
            const target = item[1];
            if (target !== null) {
                const old = this.model.tiles[item[0]];
                if (old === undefined) {
                    delete this.model.tiles[target];
                } else {
                    this.model.tiles[target] = old;
                }
            }
            i--;
        }

        // entity-changes:
        while (this.items.length > length) {
            const index = this.items.pop();
            delete this.model.tiles[index];
        }

        this.model.count = plan.count;
        this.model.tilesImg.elem = canvas;
        this.img.canvas = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;
    }

    undoDeletePlan(plan, selection) {
        const length = this.items.length + plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const old2new = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            old2new[old] = target;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const target = old2new[i];
            if (target !== undefined) {
                if (target !== null) {
                    this.drawEntity(ctx, target, x, y);
                }
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[2];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }

        // selection changes
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            for (let item of plan.selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[2];
            }
        }

        for (let item of plan.changes) {
            const target = item[1];
            if (target !== null) {
                if (this.model.tiles[target] !== undefined) {
                    this.model.tiles[item[0]] = this.model.tiles[target];
                } else {
                    delete this.model.tiles[item[0]];
                }
            } else {
                this.items.push(this.items.length);
                this.model.tiles[item[0]] = {};
            }
        }
        this.model.count = plan.count;
        this.model.tilesImg.elem = canvas;
        this.img.canvas = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        // restore entity-backups
        for (let [index, obj] of Object.entries(plan.backupTiles)) {
            this.setEntityObject(obj, true);
        }

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[1]
        }

        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const currAnimation = this.model.animations[animation];
            for (let item of frames) {
                currAnimation.frames.splice(item[0], 0, item[1]);
            }
        }
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    getLength() {
        if (this.items === undefined) {
            return this.count;
        }
        return this.items.length;
    }

    getIndexPos(index) {
        if (!this.hasIndex(index)) {
            return null;
        }
        const y = Math.floor(index/this.tilesX);
        return {x: (index - y * this.tilesX) * this.sizeX, y: y * this.sizeY};
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'image') {
            const pos = this.getIndexPos(index)
            this.img.ctx.putImageData(value, pos.x, pos.y)
            this.notify();
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[index];
            if (value === '') {
                if (tile && tile.animation) {
                    delete tile.animation;
                }
                if (JSON.stringify(tile) === '{}') {
                    delete this.model.tiles[index];
                }
            } else {
                if (!tile) {
                    this.model.tiles[index] = {animation: value};
                } else {
                    tile.animation = value;
                }
            }
            this.notify();
        }
        if (prop === 'props') {
            const tile = this.model.tiles[index];
            if (tile && JSON.stringify(value) === '{}') {
                delete this.model.tiles[index];
            } else {
                this.model.tiles[index] = value;
            }
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'image') {
            const pos = this.getIndexPos(index)
            return this.img.ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY())
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[index];
            if (!tile || !tile.animation) {
                return '';
            }
            return tile.animation;
        }
        if (prop === 'props') {
            const tile = this.model.tiles[index];
            if (!tile) {
                return {};
            }
            const {animation, ...result} = tile;
            return result;
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'props', 'animation', 'image'];
    }

    getAutoProps() {
        return ['image'];
    }

    getDimForLength(length) {
        const sizeX = this.getSizeX();
        const sizeY = this.getSizeY();

        const maxTiles = Math.floor(1000 / sizeX);
        const tilesX = Math.min(length, maxTiles);
        const width = tilesX * sizeX;
        const tilesY = Math.ceil(length / maxTiles);
        const height = tilesY * sizeY;
        return {
            width,
            height,
            tilesX,
            tilesY,
            sizeX,
            sizeY
        }
    }

    assignAutoProps(updateIndices = []) {
        const length = this.getLength();
        const dim = this.getDimForLength(length);

        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        let index = 0;
        let x = 0;
        let y = 0;
        while(index < length) {
            if (!updateIndices.includes(index)) {
                this.drawEntity(ctx, index, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                y += dim.sizeY;
                x = 0;
            }
            index++;
        }
        this.model.tilesImg.canvas = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        return ['image'];
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1, players = null) {
        if (index >= this.length) {
            return;
        }
        if (players) {
            const animation = this.getEntityPropValue(index, 'animation');
            if (animation) {
                const frame = players.getCurrFrame(animation);
                if (frame) {
                    index = frame.id;
                }
            }
        }
        const pos = this.getIndexPos(index);
        if (typeof zoomOrAvail === 'object') {
            targetCtx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img.canvas, targetCtx, x, y, zoomOrAvail, this.getIndexDim(), pos);
            }
        } else {
            const targetWidth = this.sizeX * zoomOrAvail;
            const targetHeight = this.sizeY * zoomOrAvail;
            targetCtx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                targetCtx.drawImage(
                    this.img.canvas,
                    pos.x,
                    pos.y,
                    this.sizeX,
                    this.sizeY,
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
            }
        }
    }

    getMatchingEntities(indices, match) {
        if (match === null) {
            return indices;
        }
        const result = [];
        match = ' ' + match.toLowerCase() + ' ';
        for (let index of indices) {
            if (match.indexOf(' ' + index + ' ') !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

class AliasIndex extends EntityIndex {

    constructor(model, tileIndex, animationIndex) {
        super();
        this.tileIndex = tileIndex;
        this.tileIndex.addListener(() => this.notify());
        this.animationIndex = animationIndex;
        this.model = model;
        const names = [];
        for (let [name, tile] of Object.entries(model.tiles)) {
            if (typeof name === 'string' && name.match(/[^0-9]/)) {
                if (tile.index === undefined || !Number.isInteger(tile.index)) {
                    tile.index = 0;
                }
                names.push(name);
            }
        }
        this.items = names.sort();
        this.indexSorting = (a, b) => (a === b ? 0 : (a < b ? -1 : 1));
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'tile') {
            const name = this.getEntityValue(index);
            this.model.tiles[name].index = value;
            this.notify();
        }
        if (prop === 'value') {
            if (!this.model.tiles[value]) {
                this.model.tiles[value] = {};
            }
        }
        if (prop === 'animation') {
            const name =  this.getEntityValue(index);
            const tile = this.model.tiles[name];
            if (value === '') {
                if (tile && tile.animation) {
                    delete tile.animation;
                }
            } else {
                tile.animation = value;
            }
            this.notify();
        }
        if (prop === 'props') {
            const name = this.getEntityValue(index);
            this.model.tiles[name] = value;
            this.notify();
        }
    }

    deleteEntityPropValues(index) {
        const name = this.getEntityValue(index);
        if (name) {
            delete this.model.tiles[name];
        }
    }

    getEntityPropValue(aIndex, prop) {
        if (prop === 'tile') {
            const name = this.getEntityValue(aIndex);
            return this.model.tiles[name].index;
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[this.getEntityValue(aIndex)];
            if (!tile || !tile.animation) {
                return '';
            }
            return tile.animation;
        }
        if (prop === 'props') {
            const tile = this.model.tiles[this.getEntityValue(aIndex)];
            if (!tile) {
                return {};
            }
            const {index, animation, ...result} = tile;
            return result;
        }
        return super.getEntityPropValue(aIndex, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.tiles[newValue] = this.model.tiles[oldValue];
        delete this.model.tiles[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'props', 'animation', 'tile'];
    }

    getSizeX() {
        return this.tileIndex.getSizeX();
    }

    getSizeY() {
        return this.tileIndex.getSizeY();
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1, player = null) {
        let tile = this.getEntityPropValue(index, 'tile');
        if (tile === null) {
            return;
        }
        if (player !== null) {
            const animation = this.getEntityPropValue(index, 'animation');
            if (animation !== '') {
                const frame = player.getCurrFrame(animation);
                if (!frame) {
                    return;
                }
                tile = frame.id;
            }
        }
        this.tileIndex.drawEntity(targetCtx, tile, x, y, zoomOrAvail);
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    getRenamePlan(oldName, newName) {
        const old2new = {[oldName]: newName};
        const mapChanges = getMapChanges(this.model.map, old2new);
        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }
        return {
            mapChanges,
            brushChanges,
            old2new,
            selectionChanges: null
        };
    }

    doRenamePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
    }

    undoRenamePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
    }

    getDeletePlan(indices) {
        const names = [];
        const old2new = {};
        const backupEntities = [];
        for (let index of indices) {
            const name = this.getEntityValue(index);
            if (name === null) continue;

            const obj = this.getEntityObject(index);
            obj.index = null;
            backupEntities.push(obj);
            names.push(name);
            old2new[name] = null;
        }
        const mapChanges = getMapChanges(this.model.map, old2new);

        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }

        return {
            backupEntities,
            indices,
            old2new,
            mapChanges,
            brushChanges,
            selectionChanges: null
        }
    }

    doDeletePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
        this.deleteEntities(plan.indices);
    }

    undoDeletePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
        this.setEntityObjects(plan.backupEntities, false);
    }
}

class BrushIndex extends EntityIndex {

    constructor(model, tileIndex, aliasIndex) {
        super();
        this.model = model;
        this.tileIndex = tileIndex;
        this.aliasIndex = aliasIndex;
        this.items = Object.keys(this.model.brushes).sort();
        this.indexSorting = (a, b) => (a === b ? 0 : (a < b ? -1 : 1));
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'tiles') {
            const name = this.getEntityValue(index);
            this.model.brushes[name] = value;
            this.notify();
        }
    }

    deleteEntityPropValues(index) {
        const name = this.getEntityValue(index);
        if (name) {
            delete this.model.brushes[name];
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'tiles') {
            const name = this.getEntityValue(index);
            return this.model.brushes[name];
        }
        return super.getEntityPropValue(index, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.brushes[newValue] = this.model.brushes[oldValue];
        delete this.model.brushes[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'tiles'];
    }

    getSizeX() {
        return this.tileIndex.getSizeX();
    }

    getSizeY() {
        return this.tileIndex.getSizeY();
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {
        const tiles = this.getEntityPropValue(index, 'tiles');
        const canvas = getCanvasForIndexMatrix(this.tileIndex, this.aliasIndex, tiles, 10);
        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (canvas === null) {
                return;
            }
            drawCanvasToAvail(canvas, ctx, x, y, zoomOrAvail);
        } else {
            const sizeX = canvas.width;
            const sizeY = canvas.height;
            const targetWidth = sizeX * zoomOrAvail;
            const targetHeight = sizeY * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (canvas === null) {
                return;
            }
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, targetWidth, targetHeight);
        }
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

class EventIndex extends EntityIndex {

    constructor(model, key = 'events') {
        super();
        this.model = model;
        this.key = key;
        const events = model[key] ? Object.keys(model[key]) : [];
        for (let row of model.map) {
            for (let cell of row) {
                if (Array.isArray(cell)) {
                    const [index, ...items] = cell;
                    for (let item of items) {
                        if (!events.includes(item)) {
                            events.push(item);
                            if (!this.model.events[item]) {
                                this.model.events[item] = {
                                    width: 0,
                                    height: 0,
                                    offsetX: 0,
                                    offsetY: 0,
                                    x: null,
                                    y: null
                                };
                            }

                        }
                    }
                }
            }
        }
        this.img = model.eventsImg
        this.items = events.sort();
        this.setSizes();
        this.indexSorting = (a, b) => a === b ? 0 : (a < b ? -1 : 1);
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    getEntityProps() {
        return [...super.getEntityProps(), 'offsetX', 'offsetY', 'width', 'height', 'image'];
    }

    setEntityValue(index, value) {
        if (this.model[this.key] === undefined) {
            this.model[this.key] = {};
        }
        if (this.model[this.key][value] === undefined) {
            this.model[this.key][value] = {
                width: 0,
                height: 0,
                offsetX: 0,
                offsetY: 0,
                x: null,
                y: null
            };
        }
        super.setEntityValue(index, value);
    }

    setEntityPropValue(index, name, value) {
        super.setEntityPropValue(index, name, value)
        if (['offsetX', 'offsetY', 'width', 'height'].includes(name)) {
            const id = this.getEntityValue(index);
            this.model[this.key][id][name] = value;
            this.notify()
        }
        if (name === 'image') {
            if (value !== null) {
                const pos = this.model[this.key][this.getEntityValue(index)]
                this.img.ctx.putImageData(
                    value,
                    pos.x,
                    pos.y
                )
            }
            this.notify()
        }
    }

    getEntityPropValue(index, name) {
        if (['offsetX', 'offsetY', 'width', 'height'].includes(name)) {
            const id = this.getEntityValue(index);
            const event = this.model[this.key] && this.model[this.key][id];
            if (!event) {
                return 0;
            }
            return event[name];
        }
        if (name === 'image') {
            const width = this.getEntityPropValue(index, 'width');
            if (width === 0) {
                return null;
            }
            const height = this.getEntityPropValue(index, 'height')
            const pos = this.model[this.key][this.getEntityValue(index)]
            return this.img.ctx.getImageData(pos.x, pos.y, width, height)
        }
        return super.getEntityPropValue(index, name);
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices = []) {
        let maxWidth = 500;
        const sprites = [];
        let iMax = this.getLength();
        let i = 0;
        while(i < iMax) {
            const value = this.items[i];
            const dim = {
                x: this.model.events[value] ? this.model.events[value].width : 0,
                y: this.model.events[value] ? this.model.events[value].height : 0
            };
            maxWidth = Math.max(maxWidth, dim.x);
            sprites.push([value, dim.x, dim.y, i]);
            i++;
        }
        sprites.sort((a, b) => a[2] === b[2] ? (a[1] === b[1] ? 0 : (a[1] > b[1] ? -1 : 1)) : (a[2] > b[2] ? -1 : 1));

        // now them to free space blocks
        let spaceBlocks = [[0, 0, maxWidth, null]];
        let canvasWidth  = 0;
        let canvasHeight = 0;
        let offsets = {};

        for (let sprite of sprites) {
            const [name, width, height, index] = sprite;
            // find free block matching width and height
            let found = false;
            const newBlocks = [];
            for (let block of spaceBlocks) {
                if (!found) {
                    const [x, y, blockWidth, blockHeight] = block;
                    if (blockHeight !== null && (blockWidth < width || blockHeight < height)) {
                        newBlocks.push(block);
                        continue;
                    }
                    offsets[name] = {x, y, index};
                    if (blockHeight === null) {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        newBlocks.push([0, y + height, maxWidth, null]);
                    } else {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        if (blockHeight > height) {
                            newBlocks.push([x, y + height, blockWidth, blockHeight - height]);
                        }
                    }
                    found = true;
                    canvasWidth = Math.max(x + width, canvasWidth);
                    canvasHeight = Math.max(y + height, canvasHeight);
                } else {
                    newBlocks.push(block);
                }
            }
            spaceBlocks = newBlocks;
        }
        const canvas = getCanvasForDim(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        for (let [name, offset] of Object.entries(offsets)) {
            if (!updateIndices.includes(offset.index)) {
                this.drawEntity(ctx, offset.index, offset.x, offset.y);
            }
            const pos = this.model.events[name];
            pos.x = offset.x;
            pos.y = offset.y;
        }
        this.model.eventsImg.canvas = canvas;

        return ['image'];
    }

    setSizes() {
        let maxX = 0;
        let maxY = 0;
        for (let item of this.items) {
            if (!this.model.events || !this.model.events[item]) {
                continue;
            }
            maxX = Math.max(maxX, this.model.events[item].width);
            maxY = Math.max(maxY, this.model.events[item].height);
        }
        this.sizeX = Math.max(maxX, 10);
        this.sizeY = Math.max(maxY, 10);
    }

    hasEntityImage(index) {
        const width = this.getEntityPropValue(index, 'width');
        return (width !== 0)
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {

        const width = this.getEntityPropValue(index, 'width');
        if (width === 0) {
            return;
        }
        const height = this.getEntityPropValue(index, 'height');
        const dim = {x: width, y: height};
        const pos = this.model.events[this.getEntityValue(index)];

        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img.canvas, ctx, x, y, zoomOrAvail, dim, pos);
            }
        } else {
            const targetWidth = dim.x * zoomOrAvail;
            const targetHeight = dim.y * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                ctx.drawImage(
                    this.img.canvas,
                    pos.x,
                    pos.y,
                    dim.x,
                    dim.y,
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
                return;
            }
        }
        ctx.drawImage(
            this.img.canvas,
            pos.x, pos.y,
            dim.x, dim.y,
            x, y,
            zoomOrAvail * dim.x,
            zoomOrAvail * dim.y
        );
    }

    getRenamePlan(oldName, newName) {
        const old2new = {[oldName]: newName};
        const eventChanges = getMapEventChanges(this.model.map, old2new);
        return {
            event: true,
            old2new,
            eventChanges,
            selectionChanges: null
        }
    }

    doRenamePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection)
    }

    undoRenamePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection)
    }

    getDeletePlan(indices) {
        const old2new = {};
        const backupEntities = [];
        const names = [];
        for (let index of indices) {
            const name = this.getEntityValue(index);
            if (!name) continue;
            names.push(name);
            const obj = this.getEntityObject(index);
            obj.index = null;
            backupEntities.push(obj);
            old2new[name] = null;
        }
        const eventChanges = getMapEventChanges(this.model.map, old2new);
        return {
            event: true,
            indices,
            backupEntities,
            old2new,
            eventChanges,
            selectionChanges: null
        }
    }

    doDeletePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
        this.deleteEntities(plan.indices)
    }

    undoDeletePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
        this.setEntityObjects(plan.backupEntities)
    }
}

class TilesGrid extends IndexGrid {

    constructor(tilesIndex, model, key = 'map') {
        super(tilesIndex, model, key);
        this.baseCellValue = CellValue.index;
    }

    isCellValueSupported(cellValue) {
        return [CellValue.index, CellValue.tile, CellValue.events].includes(cellValue)
    }

    hasEvents() {
        return true;
    }

    getAliases() {
        const aliases = [];
        for (let key in this.index.model.tiles) {
            if (this.index.model.tiles[key].index !== undefined && key != this.index.model.tiles[key].index) {
                aliases.push(key);
            }
        }
        return aliases;
    }

    getIndexForTile(tile) {
        const obj = this.index.model.tiles[tile];
        if (!obj || obj.index === undefined) {
            return tile;
        }
        return obj.index;
    }

    drawEvent(ctx, value, x, y, zoom) {
        const event = this.index.model.events && this.index.model.events[value];
        if (!event || !event.width) {
            return false;
        }
        ctx.drawImage(this.index.model.eventsImg.canvas, event.x, event.y, event.width, event.height, x  + (event.offsetX * zoom), y + (event.offsetY * zoom), event.width * zoom, event.height * zoom);
        return true;
    }

    updatePlayers(players, posX, posY, width, height) {
        const animations = [];
        const rect = this.getRect(posX, posY, width, height, CellValue.tile);
        for (let row of rect) {
            for (let tile of row) {
                const obj = this.index.model.tiles[tile];
                if (obj && obj.animation && !animations.includes(obj.animation)) {
                    animations.push(obj.animation);
                }
            }
        }
        players.setAnimations(animations);
    }

    drawCellValue(ctx, value, x, y, zoom, players = null) {
        let events = [];
        if (Array.isArray(value)) {
            events = value.slice(1);
            value = value[0];
        }
        const alias = typeof(value) === 'string' ? value : null;
        const obj = this.index.model.tiles[value];
        if (obj) {
            if (players && obj.animation) {
                const frame = players.getCurrFrame(obj.animation);
                if (frame) {
                    value = frame.id;
                }
            } else {
                value = this.getIndexForTile(value);
            }
        }
        super.drawCellValue(ctx, value, x, y, zoom);
        if (events.length) {
            let hasNoImage = true;
            if (this.index.model.events) {
                for (let event of events) {
                    if (this.index.model.events[event]) {
                        hasNoImage = false;
                        break;
                    }
                }
            }
        }
        if (alias) {
            const size = this.getCellSizeX() * zoom;
            ctx.fillStyle = '#00000088';
            ctx.fillRect(x, y, size, 12);
            ctx.font = '10px';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('' + alias, x + 2, y + 10, size - 4);
        }
    }
}

class CellTileValue extends CellValue {
    constructor() {
        super();
    }

    getEmpty() {
        return 0
    }

    get(curr) {
        if (Array.isArray(curr)) {
            return curr[0]
        }
        return curr;
    }

    set(curr, value) {
        if (Array.isArray(curr)) {
            curr[0] = value;
            return curr;
        }
        return value;
    }

    isEmpty(curr) {
        return curr === 0
    }

    getName() {
        return 'Tiles';
    }

    getId() {
        return 'tile'
    }
}

class CellEventsValue extends CellValue {
    constructor() {
        super();
    }

    getEmpty() {
        return []
    }

    get(curr) {
        if (Array.isArray(curr)) {
            return curr.slice(1);
        }
        return [];
    }

    set(curr, value) {
        if (Array.isArray(curr)) {
            if (value.length === 0) {
                return curr[0];
            }
            return [curr[0], ...value]
        }
        if (value.length === 0) {
            return curr;
        }
        return [curr, ...value]
    }

    isEmpty(curr) {
        return curr.length === 0
    }

    add(base, addItems) {
        const result = [...base];
        for (let item of addItems) {
            if (!result.includes(item)) {
                result.push(item);
            }
        }
        return result
    }

    sub(base, subItems) {
        const result = [];
        for (let item of base) {
            if (!subItems.includes(item)) {
                result.push(item);
            }
        }
        return result;
    }

    getName() {
        return 'Events';
    }

    getId() {
        return 'events'
    }
}

function getMapChanges(map, old2new) {
    const mapChanges = [];

    for (let y = 0; y < map.length; y++) {
        const row = map[y];
        for (let x = 0; x < row.length; x++) {
            const index = CellValue.tile.get(row[x]);
            const newIndex = old2new[index];
            if (newIndex !== undefined) {
                mapChanges.push([x, y, index, newIndex === null ? 0 : newIndex]);
            }
        }
    }
    return mapChanges;
}

function getMapEventChanges(map, old2new, raw = false) {
    const eventChanges = [];
    for (let y = 0; y < map.length; y++) {
        const row = map[y];
        for (let x = 0; x < row.length; x++) {
            const events = raw ? row[x] : CellValue.events.get(row[x]);
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const newEvent = old2new[event];
                if (newEvent !== undefined) {
                    eventChanges.push([x, y, i, event, newEvent]);
                }
            }
        }
    }
    return eventChanges;
}

function doEventChange(map, item, no, raw = false) {
    const curr = map[item[1]][item[0]];
    const events = raw ? curr : CellValue.events.get(curr);
    const index = item[2];
    const target = item[no];
    if (target === null) {
        events.splice(index, 1);
    } else {
        events.splice(index, 1, target);
    }
    map[item[1]][item[0]] = raw ? events : CellValue.events.set(curr, events);
}

function doPlanOnModel(model, plan, selection) {
    if (plan.mapChanges) {
        for (let item of plan.mapChanges) {
            model.map[item[1]][item[0]] = item[3];
        }
    }

    if (plan.eventChanges) {
        for (let item of plan.eventChanges) {
            doEventChange(model.map, item, 4);
        }
    }

    if (plan.brushChanges) {
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }
    }

    // selection changes
    if (plan.selectionChanges !== undefined) {
        let selectionChanges = null;
        if (selection !== null && selection.getType() !== 'entity') {
            const cells = selection.getCells();
            const cellValue = selection.getCellValue();
            if (!plan.event && cellValue === CellValue.tile) {
                selectionChanges = {
                    ref: selection,
                    changes: getMapChanges(cells, plan.old2new)
                };
                for (let item of selectionChanges.changes) {
                    selection.cells[item[1]][item[0]] = item[3];
                }
            } else if (cellValue === CellValue.events) {
                selectionChanges = {
                    ref: selection,
                    changes: getMapEventChanges(selection.cells, plan.old2new, true)
                };
                for (let item of selectionChanges.changes) {
                    doEventChange(selection.cells, item, 4, true);
                }
                if (selection.cells[0][0].length === 0) {
                    selection.cells = [[]];
                }
            }
        }
        plan.selectionChanges = selectionChanges;
    }

    if (plan.propChanges) {
        const prop = plan.prop ? plan.prop : 'index';
        for (let item of plan.propChanges) {
            model.tiles[item[0]][prop] = item[2]
        }
    }

    if (plan.frameIdChanges) {
        for (let item of plan.frameIdChanges) {
            model.animations[item[0]].frames[item[1]].id = item[3];
        }
    }

    if (plan.propRemovals) {
        for (let item of plan.propRemovals) {
            delete model.tiles[item[0]][item[1]]
        }
    }
}

function undoPlanOnModel(model, plan, selection) {
    if (plan.mapChanges) {
        for (let item of plan.mapChanges) {
            model.map[item[1]][item[0]] = item[2];
        }
    }

    if (plan.eventChanges) {
        for (let item of plan.eventChanges) {
            doEventChange(model.map, item, 3);
        }
    }

    if (plan.brushChanges) {
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }
    }

    if (plan.selectionChanges) {
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            if (!plan.event) {
                for (let item of plan.selectionChanges.changes) {
                    selection.cells[item[1]][item[0]] = item[2];
                }
            } else {
                for (let item of plan.selectionChanges.changes) {
                    doEventChange(selection.cells, item, 3, true);
                }
            }
        }
    }
    /*
    if (plan.changes) {
        for (let item of plan.changes) {
            const target = item[1];
            if (target !== null) {
                if (model.tiles[target] !== undefined) {
                    model.tiles[item[0]] = model.tiles[target];
                } else {
                    delete model.tiles[item[0]];
                }
            } else {
                this.items.push(this.items.length);
                this.model.tiles[item[0]] = {};
            }
        }
    }
    /*
    this.model.count = plan.count;
    this.model.tilesImg.elem = canvas;
    this.img = canvas;
    this.tilesX = dim.tilesX;
    this.tilesY = dim.tilesY;
    */

    // restore entity-backups
    if (plan.backupTiles) {
        for (let [index, obj] of Object.entries(plan.backupTiles)) {
            this.setEntityObject(obj, true);
        }
    }

    // 4. propChanges
    if (plan.propChanges) {
        const prop = plan.prop ? plan.prop : 'index';
        for (let item of plan.propChanges) {
            model.tiles[item[0]][prop] = item[1]
        }
    }
    if (plan.frameBackup) {
        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const currAnimation = model.animations[animation];
            for (let item of frames) {
                currAnimation.frames.splice(item[0], 0, item[1]);
            }
        }
    }
    if (plan.frameIdChanges) {
        for (let item of plan.frameIdChanges) {
            model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    if (plan.propRemovals) {
        for (let item of plan.propRemovals) {
            model.tiles[item[0]][item[1]] = item[2];
        }
    }
}

function getPropChanges(prop, model, old2new) {
    const changes = [];
    for (let [key, obj] of Object.entries(model.tiles)) {
        const old = obj[prop];
        if (old !== undefined) {
            const target = old2new[old];
            if (target !== undefined) {
                changes.push([key, old, target]);
            }
        }
    }
    return changes;
}

CellValue.tile = new CellTileValue();
CellValue.events = new CellEventsValue();

export {
    TileIndex,
    BrushIndex,
    AliasIndex,
    EventIndex,
    TilesGrid,
    CellTileValue,
    CellEventsValue
}