class Config {
    constructor(json) {
        if (json !== undefined) {
            if (typeof json !== 'object') {
                throw 'Config must be instantiated with a JSON!';
            }
            this.parse(json);
        }
    }

    validateInt(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'number') {
            throw Error('value must be an integer');
        }
        if (props.min && value < props.min) {
            throw Error('value is less than ' + props.min);
        }
        if (props.max && value > props.max) {
            throw Error('value is more than ' + props.max);
        }
        return value;
    }

    validateString(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'string') {
            throw Error('value must be a string');
        }
        if (props.min && value.length < props.min) {
            throw Error('value is shorter than ' + props.min);
        }
        if (props.max && value.length > props.max) {
            throw Error('value is longer than ' + props.max);
        }
        return value;
    }

    validateObject(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'object') {
            throw Error('value must be an object');
        }
        return value;
    }

    validateImage(value) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'string' || !value.startsWith('data:image/')) {
            throw Error('value must be an image dataURL');
        }
        return value;
    }

    parse(json) {
        for (let key in json) {
            const value = json[key];
            if (key !== '' && value !== undefined) {
                const setKey = 'set' + key[0].toUpperCase() + key.substr(1);
                console.log(setKey);
                if (this[setKey]) {
                    this[setKey](value);
                }
            }
        }
    }

    exists(keys = []) {
        Object.freeze(this);
        for(let key of keys) {
            if (this[key] === undefined) {
                throw Error(`Missing key "${key}" in config`);
            }
        }
    }

    applyTo(obj) {
        return obj;
    }

    getJson() {
        return this.applyTo({});
    }
}

class FontMapConfig extends Config {
    setWidth(width) {
        this.width = this.validateInt(width, {min: 1, max: 256});
    }

    setHeight(height) {
        this.height = this.validateInt(height, {min: 1, max: 256});
    }

    setImage(image) {
        this.image = this.validateImage(image);
    }

    setMap(map) {
        for(let char in this.validateObject(map)) {
            const props = this.validateObject(map[char]);
            this.addChar(char, props.x, props.y);
        }
    }

    addChar(char, x, y) {
        if (this.map === undefined) {
            this.map = {};
        }
        this.map[this.validateString(char, {min: 1, max: 1})] = {
            x: this.validateInt(x, {min: 0}),
            y: this.validateInt(y, {min: 0})
        };
    }

    addRange(from, to, x, y) {
        if (this.width === undefined) {
            throw Error('Width required but not set!');
        }
        const fromCode = this.validateString(from, {min: 1, max: 1}).charCodeAt(0);
        const toCode = this.validateString(to, {min: 1, max: 1}).charCodeAt(0);
        for (let i = fromCode; i <= toCode; i++) {
            this.addChar(String.fromCharCode(i), x, y);
            x += this.width;
        }
    }

    applyTo(obj) {
        super.exists(['width', 'height', 'image']);
        obj.width = this.width;
        obj.height = this.height;
        obj.image = this.image;
        obj.map = this.map ? {...this.map} : {};

        return obj;
    }
}

export {
    FontMapConfig
};