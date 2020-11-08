const assert = require('chai').assert;

class IndexProvider {

    constructor() {
        this.allIndices = null;
        this.suspendNotifications = false;
    }

    addListener(listener) {
        if (!this.listeners) {
            this.listeners = [];
        }
        this.listeners.push(listener);
    }

    removeListener(listener) {
        if (!this.listeners) {
            return;
        }
        if (this.listeners.includes(listener)) {
            this.listeners.splice(this.listeners.indexOf(listener), 1);
        }
    }

    notify() {
        if (this.suspendNotifications) {
            return;
        }
        this.allIndices = null;
        if (!this.listeners) {
            return;
        }
        for (let listener of this.listeners) {
            listener();
        }
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    getIndexDim() {
        return {x: this.getSizeX(), y: this.getSizeY()}
    }

    getLength() {
        return this.items.length;
    }

    getProps() {
        return ['index', 'value'];
    }

    getPropValue(index, prop) {
        if (prop === 'index') {
            return index;
        } else if (prop === 'value') {
            return this.items[index];
        }
    }

    getIndexProps(index) {
        const obj = {};
        const props = this.getProps();
        for (let prop of props) {
            obj[prop] = this.getPropValue(index, prop)
        }
        return obj;
    }

    getAllIndices() {
        if (this.allIndices === null) {
            const indices = [];
            let i = 0;
            let iMax = this.getLength();
            while (i < iMax) {
                indices.push(i++);
            }
            this.allIndices = indices;
        }
        return this.allIndices;
    }

    getIndex(index) {
        return this.items[index];
    }

    getObjectsForIndices(indices = null) {
        const result = [];
        if (indices === null) {
            indices = this.getAllIndices();
        }
        for (let index of indices) {
            result.push(this.getIndexProps(index));
        }
        return result
    }

    hasIndex(index) {
        return (index >= 0 && index < this.getLength());
    }

    setIndex(index, value) {
        this.items[index] = value;
        this.notify();
    }

    setItems(items) {
        this.items = items;
        this.notify();
    }

    setIndexFromObject(obj, overwrite = false) {
        return this.setIndicesFromObjects([obj], overwrite)[0];
    }

    getAutoProps() {
        return [];
    }

    assignAutoProps(updatedIndices = []) {
        return [];
    }

    setIndexProp(index, prop, value) {
        switch(prop) {
            case 'index':
                break;

            case 'value':
                this.setIndex(index, value);
                break;
        }
    }

    setIndicesFromObjects(objects, overwrite = false) {
        this.suspendNotifications = true;
        const result = [];
        let changeIndex = [];
        let i = 0;
        const iMax = this.getLength();
        while(i < iMax) {
            changeIndex.push({
                newValue: this.getIndex(i),
                objIndex: null,
                currIndex: i++
            });
        }
        let objIndex = 0;
        for (let obj of objects) {
            result.push(null);
            if (obj.index !== undefined) {
                if (overwrite) {
                    changeIndex[obj.index].newValue = obj.value;
                } else {
                    changeIndex.splice(obj.index, 0, {
                        newValue: obj.value,
                        objIndex,
                        currIndex: null
                    });
                }
            } else if (obj.value !== undefined) {
                changeIndex.push({
                    newValue: obj.value,
                    objIndex,
                    currIndex: null
                });
            }
            objIndex++;
        }

        if (this.indexSorting) {
            changeIndex.sort((a, b) => {
                return this.indexSorting(a.newValue, b.newValue);
            });
        }

        const newIndex = [];
        const updates = [];
        i = 0;
        for (let item  of changeIndex) {
            const index = i++;
            newIndex.push(item.newValue);
            if (item.currIndex !== null && index === item.currIndex && item.objIndex === null) {
                continue;
            }
            if (item.objIndex !== null) {
                result[item.objIndex] = index;
            }
            if (item.currIndex === null) {
                updates.push([index, objects[item.objIndex]]);
            } else {
                updates.push([index, this.getIndexProps(item.currIndex)]);
            }
        }

        this.setItems(newIndex);

        const props = [];
        const autoProps = this.getAutoProps();
        for (let prop of this.getProps()) {
            if (prop === 'index' || autoProps.includes(prop)) {
                continue;
            }
            props.push(prop);
        }

        const updateIndices = [];
        for (let [index, obj] of updates) {
            updateIndices.push(index);
            for (let prop of props) {
                this.setIndexProp(index, prop, obj[prop]);
            }
        }
        if (autoProps.length > 0) {
            const reassignProps = this.assignAutoProps(updateIndices);
            if (reassignProps.length > 0) {
                for (let [index, obj] of updates) {
                    for (let prop of reassignProps) {
                        this.setIndexProp(index, prop, obj[prop]);
                    }
                }
            }
        }

        this.suspendNotifications = false;
        this.notify();
        return result
    }

    deleteIndexProps(index) {}

    deleteIndex(index) {
        this.deleteIndices([index]);
    }

    deleteIndices(indices) {
        this.suspendNotifications = true;
        const newItems = [];
        const length = this.getLength();
        let i = 0;
        while(i < length) {
            if (!indices.includes(i)) {
                newItems.push(this.getIndex(i));
            } else {
                this.deleteIndexProps(i);
            }
            i++;
        }
        this.setItems(newItems);
        this.assignAutoProps();
        this.suspendNotifications = false;
        this.notify();
    }

    // MATCH

    hasPropValueMatch(prop, matching) {
        const indices = this.getAllIndices();
        for(let index of indices) {
            const value = this.getPropValue(index, prop);
            if (value !== undefined && matching(value)) {
                return true;
            }
        }
        return false
    }

    getMatchingIndices(match) {
        return this.getAllIndices();
    }

    getViewIndices(start, length = null, match = null, sort = null) {
        const items = match ? this.getMatchingIndices(match) : this.getAllIndices();

        // TODO sorting here

        const matches = [];
        const count = items.length;
        if (length === null) {
            length = count;
        }
        const max = Math.min(count, index + length);
        let i = index;
        while (i < max) {
            matches.push(items[i]);
            i++;
        }
        return {
            matches,
            count
        };
    }
}

class SimpleIndex extends IndexProvider {
    constructor(model, key = 'items') {
        super();
        this.model = model;
        this.key = key;
        this.items = model[this.key];
        this.images = {
        };
    }

    setIndexProp(index, prop, value) {
        super.setIndexProp(index, prop, value);
        if (prop === 'image') {
            this.images[index] = value;
        }
    }

    getPropValue(index, prop) {
        if (prop === 'image') {
            return this.images[index];
        }
        return super.getPropValue(index, prop);
    }

    getProps() {
        return  [...super.getProps(), 'image'];
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices) {
        // here we can regenerate the image
        return ['image'];
    }
}

/*
    TODO
     - was ist mit setIndex(index, value)
         => speziell, wenn der value hier zu einer Umsortierung führt

     - werden beim overwrite auch die artifakte des alten index aufgeräumt?

 */


describe('SimpleIndex', function () {
   it('should have added items', function() {
       const index = new SimpleIndex({items: ['c', 'a', 'e']});
       assert.equal(index.getLength(), 3);
       assert.equal(index.getIndex(0), 'c');
       assert.equal(index.getIndex(2), 'e');
       assert.strictEqual(index.getIndex(3), undefined);

       assert.sameMembers(
           index.setIndicesFromObjects([{value: 'd', index: 1}], false),
           [1]
       );

       assert.equal(index.getLength(), 4);
       assert.strictEqual(index.getIndex(1), 'd');
       index.setIndex(1, 'b');
       assert.equal(index.getIndex(1), 'b');

       assert.sameMembers(index.setIndicesFromObjects([{value: 'x', image: 'foo'}], false), [4]);
       assert.equal(index.getLength(), 5);
       assert.strictEqual(index.getIndex(4), 'x');

       index.setIndicesFromObjects([{value: 't', index: 0}], true);
       assert.equal(index.getLength(), 5);
       assert.equal(index.getIndex(0), 't');
       assert.equal(index.getIndex(1), 'b');

       assert.sameMembers(index.getIndexMatches(0, 10).matches, [0, 1, 2, 3, 4]);
   });

   it('should delete items', function() {
       const index = new SimpleIndex({items: ['c', 'a', 'e', 'x', 'y']});
       index.deleteIndex(2);
       assert.equal(index.getLength(), 4);
       assert.equal(index.getIndex(1), 'a');
       assert.equal(index.getIndex(2), 'x');

       index.deleteIndices([0, 3]);
       assert.equal(index.getLength(), 2);
       assert.equal(index.getIndex(0), 'a');
       assert.equal(index.getIndex(1), 'x');

       assert.sameMembers(index.getIndexMatches(0).matches, [0, 1]);
   });

});