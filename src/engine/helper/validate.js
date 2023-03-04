import inst from "core/instances"
import { isValidResourceId } from "./shared"
import {AudioResource, ImageResource} from "core/classes"
import { isObject, without, cloneDeep, d } from "./helper"

const validated = {

    id: (value, options = {}) => {
        if (value == undefined) {
            if (options.null)
                return null

            throw Error('config requires an id property')
        }
        if (options.null && value === null)
            return null

        if (typeof value !== 'string')
            throw Error('id must be a string')

        if (!isValidResourceId('json', value))
            throw Error('Invalid id for json resource')

        return value;
    },

    bool: (value) => {
        if (typeof value !== 'boolean') {
            throw Error('value must be a boolean');
        }
        return value;
    },

    int: (value, props = {}) => {
        if (value === undefined) {
            if (props.optional) return
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
    },

    float: (value, props = {}) => {
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
    },

    string: (value, props = {}) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (props.null && value === null) {
            return null;
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
            throw Error(`value "${value}" not allowed`);
        }
        return value;
    },

    array: (value, props = {}) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (props.null && value === null) {
            return null;
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
    },

    jsonResource: (value, props = {}) => {
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
    },

    jsonResources: (values, props = {}) => {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error(`Expected array of json resources but got ${typeof values}`);
        }
        const result = [];
        for (let value of values) {
            result.push(validated.jsonResource(value))
        }
        return result;
    },

    imageResource: (value, props = {}) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (value === null) {
            if (props.null) return null
            throw Error(`Excepted ImageResource but got null`)
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
    },

    imageResources: (values, props = {}) => {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error(`Expected array of image resources but got ${typeof values}`);
        }
        const result = [];
        for (let value of values) {
            result.push(validated.imageResource(value));
        }
        return result;
    },

    audioResource: (value, props = {}) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (value === null) {
            if (props.null) return null
            throw Error(`Excepted AudioResource but got null`)
        }
        if (typeof value === 'string') {
            value = inst.RL.getAudioResource(value);
        }
        if (!(value instanceof AudioResource)) {
            throw Error('value is no audio resource!');
        }
        if (!value.isResolved()) {
            throw Error(`AudioResource "${value.id}" not yet resolved, must be registered first!`);
        }
        return value;
    },

    object: (value, props = {}) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (!isObject(value)) {
            throw Error('value must be an object');
        }
        if (props.keys) {
            const missing = without(props.keys, Object.keys(value))
            if (missing.length) throw Error(`Missing keys in object: ${missing.join(', ')}`)
        }
        return value
    },

    image: (value) => {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'string' || !value.startsWith('data:image/')) {
            throw Error('value must be an image dataURL');
        }
        return value;
    },

    color: (value) => {
        validated.string(value)
        if (value[0] !== '#') {
            throw Error('Must start with #')
        }
        return value
    },

    configs: (config, values) => {
        if (values === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(values)) {
            throw Error('value must be an array');
        }
        const result = [];
        for (let value of values) {
            result.push(validated.config(config, value));
        }
        return result;
    },

    config: (config, value, props = {}) => {
        if (props.null && value === null) {
            return null;
        }
        if (typeof value === 'string') {
            value = inst.RL.getJsonResource(value);
        }
        // TODO this will probaly not work in production mode
        if (value._type && value._type.factory === config) return value.config

        if (!(value instanceof config.Config)) {
            const params = [value]
            if (isObject(value)) {
                if (!(value instanceof config.Config)) {
                    value = new config.Config(...params)
                }
            }
        }
        return value
    }
}

export {
    validated
}