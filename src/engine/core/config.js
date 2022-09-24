import { isValidResourceId } from "../helper/helper.js";
import inst from "./instances.js";
import { ImageResource } from "./classes.js";

class Config {

    constructor(json) {
        if (typeof json !== 'object') {
            throw Error('Config must be instantiated with a JSON!');
        }
        this.fieldProps = this.getFieldProps();
        this.resolved = false;
        this.parse({ ...this.getDefaults(), ...json });
    }

    getFieldProps() {
        return {};
    }

    getFieldProp(field, add = {}) {
        const props = this.fieldProps[field] ? this.fieldProps[field] : {};
        return {...props, ...add};
    }

    getRebuildJson(deep = true, base = null) {
        if (base === null) {
            base = this.getJson();
        }
        return this.addRebuildProps({id: base.id}, deep, base);
    }

    addRebuildProps(obj, deep, base) {
        return obj;
    }

    getResources(type = null) {
        const result = {
            resources: [],
            dependencies: {}
        };
        this.addResources(result, type);
        return result;
    }

    addResources(result, type = null) {
        if (type === null || type === 'json') {
            result.resources.push({
                id: this.id,
                type: 'json',
                data: this.getRebuildJson(false)
            });
        }
        result.dependencies['json:' + this.id] = [];
        this.addSubResources(result, type);
    };

    addSubResources(result, type) {
        const deps = this.getSubResources();
        for (let dep of deps) {
            const sourceId = 'json:' + this.id;
            const targetId = dep.type + ':' + dep.id;
            if (!result.dependencies[sourceId].includes(targetId)) {
                result.dependencies[sourceId].push(targetId);
            }
            if (dep.type === 'json') {
                dep.data.config.addResources(result, type);
            } else if (type === null || dep.type === type) {
                result.resources.push(dep);
            }
        }
        return result
    }

    getSubResources() {
        return [];
    }

    getDefaults() {
        return {};
    }

    validateBool(value) {
        if (typeof value !== 'boolean') {
            throw Error('value must be a boolean');
        }
        return value;
    }

    validateInt(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (props.null && value === null) {
            return null;
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

    validateFloat(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (props.null && value === null) {
            return null;
        }
        if (typeof value !== 'number') {
            throw Error('value must be a float');
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
        if (props.size && value.length !== props.size) {
            throw Error('value must have a length of ' + props.size);
        }
        if (props.values && !props.values.includes(value)) {
            throw Error('value not allowed');
        }
        return value;
    }

    validateArray(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(value)) {
            throw Error('value must be an array');
        }
        if (props.min && value.length < props.min) {
            throw Error('value is shorter than ' + props.min);
        }
        if (props.max && value.length > props.max) {
            throw Error('value is longer than ' + props.max);
        }
        if (props.size && value.length !== props.size) {
            throw Error('value must have a length of ' + props.size);
        }
        return value;
    }

    validateJsonResource(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        let id = null;
        if (typeof value === 'string') {
            id = value;
        } else if (typeof value === 'object') {
            id = value.id;
        }
        if (id && inst.RL.hasResource('json', id)) {
            value = inst.RL.getJsonResource(value);
        }
        if (!(typeof value !== 'object')) {
            throw Error('value is no JSON object!');
        }
        if (!value.__resolved) {
            throw Error(`JSON resource "${value.id}" not yet resolved, must be registered first!`);
        }
        return value;
    }

    validateJsonResources(values, props = {}) {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error(`Expected array of json resources but got ${typeof values}`);
        }
        const result = [];
        for (let value of values) {
            result.push(this.validateJsonResource(value));
        }
        return result;
    }

    validateImageResource(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value === 'string') {
            value = inst.RL.getImageResource(value);
        }
        if (!(value instanceof ImageResource)) {
            throw Error('value is no image resource!');
        }
        if (!value.isResolved()) {
            throw Error(`ImageResource "${value.id}" not yet resolved, must be registered first!`);
        }
        return value;
    }

    validateImageResources(values, props = {}) {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error(`Expected array of image resources but got ${typeof values}`);
        }
        const result = [];
        for (let value of values) {
            result.push(this.validateImageResource(value));
        }
        return result;
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

    validateColor(value) {
        this.validateString(value);
        if (value[0] !== '#') {
            throw Error('Must start with #')
        }
        return value
    }

    validateConfigs(config, values) {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error('value must be an array of ');
        }
        const result = [];
        for (let value of values) {
            result.push(this.validateConfig(config, value));
        }
        return result;
    }

    validateConfig(config, value) {
        if (typeof value === 'string') {
            value = inst.RL.getJsonResource(value);
        }
        if (!(value instanceof config)) {
            if (typeof value === 'object') {
                if (!(value instanceof config.Config)) {
                    value = new config.Config(value);
                }
            }
            if (value instanceof config.Config) {
                value = new config(value);
            }
            if (!(value instanceof config)) {
                throw Error('YYY');
            }
        }
        return value;
    }

    validateId(value, options = {}) {
        if (value == undefined) {
            if (options.null) {
                return null;
            }
            throw Error('config requires an id property');
        }
        if (options.null && value === null) {
            return null;
        }
        if (typeof value !== 'string') {
            throw Error('id must be a string');
        }

        if (!isValidResourceId('json', value)) {
            throw Error('Invalid id for json resource');
        }
        return value;
    }

    setId(value) {
        this.id = this.validateId(value);
    }

    parse(json) {
        if (json.id !== undefined) {
            this.setId(json.id);
        }
        for (let key in json) {
            const value = json[key];
            if (key !== '' && value !== undefined) {
                const setKey = 'set' + key[0].toUpperCase() + key.substring(1);
                if (this[setKey]) {
                    try {
                        this[setKey](value);
                    } catch (e) {
                        throw Error(`Error setting config key "${key}": ${e.message}`);
                    }
                }
            }
        }
    }

    freezeDeep(obj) {
        return Object.freeze(obj);
    }

    resolve() {
        if (this['id'] === undefined) {
            throw Error(`Missing key "id" in config`);
        }
        this.resolved = true;
        if (!Object.isFrozen(this)) {
            this.freezeDeep(this);
        }
    }

    isEditable() {
        return false;
    }

    applyTo(obj) {
        if (!this.isEditable) {
            this.resolve();
        }
        obj.id = this.id;
        return obj;
    }

    getJson() {
        const obj = this.applyTo({});
        obj.__type = this.getType();
        return obj;
    }

    getType() {
        return Object.getPrototypeOf(this).constructor.name;
    }

    isResolved() {
        return this.resolved;
    }
}

export {
    Config
}