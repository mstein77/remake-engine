const STATE = {
    CONSTRUCT: 0,
    INIT: 1,
    CONNECT: 2,
    PREBOOT_ERROR: 3,
    BOOT: 4,
    RUNNING: 5,
    STOPPED: 6,
    EDIT: 7,
    READY: 8
}

const RENDERER_STATE = {
    CONSTRUCTED: 0,
    WAIT_LOADING: 1,
    LOADING: 2,
    LOADED: 3,
    WAIT_BUILD: 4,
    BUILD: 5,
    WAIT_HANDLING: 6,
    HANDLING: 7,
    HALTED: 8,
    WAIT_DESTROY: 9
}

const RESOURCE = {
    TYPE: {
        JSON: 0,
        IMAGE: 1,
        AUDIO: 2
    }
}
RESOURCE.PREFIX = {
    [RESOURCE.TYPE.JSON]: 'j',
    [RESOURCE.TYPE.IMAGE]: 'i',
    [RESOURCE.TYPE.AUDIO]: 'a'
}
RESOURCE.TEXT = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio'
}
RESOURCE.KEY = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio'
}

const FILTER = {
    TYPE: {
        CANVAS: 0,
        IMAGEDATA: 1
    },
    PARAM: {
        STRING: 0,
        FLOAT: 1,
        COLOR: 2,
        MAPPING: 3,
        INT: 4
    }
}

const INPUT = {
    TYPE: {
        PRESSED_DOWN: 0,
        PRESS_AND_RELEASE: 1
    },
    STATE: {
        NOTPRESSED: 0,
        PRESSED: 1,
        AWAIT_NOTPRESSED: 2,
        AWAIT_PRESSED: 3
    }
}

const PATH = {
    TYPE: {
        STRAIGHT: 0,
        ACCELERATED: 1,
        DAMPED: 2
    }
}

const COLLISION = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    INCLUDE: 'include',
    COVER: 'cover'
}

const ANIMATION = {
    DIR: {
        FORWARD: 0,
        BACKWARD: 1,
        FORWARD_BACKWARD: 2,
        BACKWARD_FORWARD: 3
    },
    END: {
        LOOP: 0,
        STOP: 1,
        DELETE: 2
    },
    STATE: {
        EMPTY: -1,
        WAITING: 0,
        RUNNING: 1,
        DONE: 2,
        DESTROYED: 3,
        PAUSED: 4
    }
}

const TILE = {
    DIM_1x1: 0,
    DIM_2x2: 1,
    DIM_4x4: 2,
    DIM_8x8: 3,
    DIM_16x16: 4,
    DIM_32x32: 5,
    DIM_64x64: 6,
    DIM_128x128: 7,
    DIM_256x256: 8
}

const DEGREE_90 = Math.PI / 2

export {
    STATE,
    RENDERER_STATE,
    FILTER,
    INPUT,
    PATH,
    COLLISION,
    ANIMATION,
    TILE,
    DEGREE_90,
    RESOURCE
}