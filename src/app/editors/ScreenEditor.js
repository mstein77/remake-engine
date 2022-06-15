import {
    AvailContext,
    EditorCtx,
    AvailContextProvider,
    Section,
    Toolbar,
    useCssProps,
    Separator,
    useWatcher,
    WindowContext,
    useCachedState,
    useComponentUpdate
} from "../components/BasicComponents";
import React, { useContext, useMemo, useRef, useState } from "react";
import { Object3D, Scene, Scene3DCanvas } from "../components/WebGLComponents";
import { Block, Overlay, Overlays, Stack, DIR } from "../components/LayoutComponents";
import { Button, Number, Radio, Checkbox } from "../components/FormComponents";
import { d, reverse, clamp, getSinePath, hex2rgbaArray} from "../helper/helper";
import { useTracker, TrackingCtx } from "../components/GridComponents";
import { FullTree } from "../components/EditorComponents";
import {PocEditor} from "./PocEditor";
import { ScreenTreeView } from "../classes/Tree";

const coordTextureShader = {
    id: 'coordTexture',
    source: `
                attribute vec4 aVertexPosition;
                attribute vec2 aTextureCoord;
            
                uniform mat4 uModelMatrix;
                uniform mat4 uViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform mat4 uOriginMatrix;
            
                varying highp vec2 vTextureCoord;
                varying highp float yDist;

                highp vec4 zeroVector; 
                             
                void main(void) {
                  zeroVector = aVertexPosition;
                  zeroVector = uModelMatrix * zeroVector;

                  gl_Position = uProjectionMatrix * uOriginMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
                  vTextureCoord = aTextureCoord;
                  yDist = zeroVector.y;
                }
              `,
    attribs: [
        {name: 'aVertexPosition', source: 'positions'},
        {name: 'aTextureCoord', source: 'texture'}
    ],
    uniforms: [
        {name: 'uModelMatrix', func: 'uniformMatrix4fv'},
        {name: 'uViewMatrix', func: 'uniformMatrix4fv'},
        {name: 'uProjectionMatrix', func: 'uniformMatrix4fv'},
        {name: 'uOriginMatrix', func: "uniformMatrix4fv"}
    ]
};

const coordColorShader = {
    id: 'coordColor',
    source: `
                attribute vec4 aVertexPosition;
                attribute vec4 aVertexColor;
            
                uniform mat4 uModelMatrix;
                uniform mat4 uViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform mat4 uOriginMatrix;
           
                varying highp float yDist;                
                varying lowp vec4 vColor;
                             
                highp vec4 zeroVector; 
                highp vec4 compVector;

                void main(void) {
                  zeroVector = aVertexPosition;
                  zeroVector = uModelMatrix * zeroVector;
                
                  compVector = uModelMatrix * 
                    aVertexPosition;
                  gl_Position = uProjectionMatrix * uOriginMatrix * uViewMatrix * uModelMatrix * 
                    aVertexPosition;
                  vColor = aVertexColor;
                  yDist = zeroVector.y;
                }
              `,
    attribs: [
        {name: 'aVertexPosition', source: 'positions'},
        {name: 'aVertexColor', source: 'colors'}
    ],
    uniforms: [
        {name: 'uModelMatrix', func: 'uniformMatrix4fv'},
        {name: 'uViewMatrix', func: 'uniformMatrix4fv'},
        {name: 'uProjectionMatrix', func: 'uniformMatrix4fv'},
        {name: 'uOriginMatrix', func: "uniformMatrix4fv"}
    ]
};

const textureShader = {
    id: 'texture',
    source: `
                varying highp vec2 vTextureCoord;
                varying highp float yDist;

                uniform sampler2D uSampler;
                uniform int uMirror;
            
                void main(void) {
                  if (uMirror > 0) {
                      if (yDist > 0.0) {
                          discard;
                      } else {
                          gl_FragColor = texture2D(uSampler, vTextureCoord);
                          gl_FragColor = vec4(gl_FragColor.rgb, 0.65 * gl_FragColor.a);
                      }
                  } else {
                      if (yDist <= 0.0) {
                          discard;
                      } else {
                          gl_FragColor = texture2D(uSampler, vTextureCoord);
                      }
                  }
                }
            `,
    uniforms: [
        {name: 'uMirror', func: 'uniform1i', default: 0},
        {name: 'uSampler', func: 'uniform1i'},
    ]
};

const colorShader = {
    id: 'color',
    source: `
                varying lowp vec4 vColor;
                varying highp float yDist;
                uniform int uMirror;
                              
                void main(void) {
                  if (uMirror > 0) {
                      if (yDist > 0.0) {
                          discard;
                      } else {
                          gl_FragColor = vec4(vColor.rgb, 0.65 * vColor.a);
                      }
                  } else {
                      if (yDist <= 0.0) {
                          discard;
                      } else {
                          gl_FragColor = vColor;
                      }
                  }
                }
            `,
    uniforms: [
        {name: 'uMirror', func: 'uniform1i', default: 0},
    ]
};

const colorInvertShader = {
    id: 'colorInvert',
    source: `
                varying lowp vec4 vColor;
                varying highp float yDist;
                uniform int uMirror;
                
                highp vec4 iVector; 
                             
                void main(void) {
                  if (uMirror > 0) {
                      if (yDist > 0.0) {
                          discard;
                      } else {
                          iVector = vec4(vColor.rgb, 0.65 * vColor.a);
                          iVector.r = iVector.r;
                          iVector.g = 1.0 - iVector.g;
                          iVector.b = 1.0 - iVector.b;
                          gl_FragColor = iVector;
                      }
                  } else {
                      if (yDist <= 0.0) {
                          discard;
                      } else {
                          iVector = vColor;
                          iVector.r = iVector.r;
                          iVector.g = 1.0 - iVector.g;
                          iVector.b = 1.0 - iVector.b;
                          gl_FragColor = iVector;
                      }
                  }
                }
            `,
    uniforms: [
        {name: 'uMirror', func: 'uniform1i', default: 0},
    ]
};

const staticJobs = {};

class Cursor3D extends Object3D {

    constructor( ...params ) {
        super( ...params );
        this.width = 1;
        this.height = 1;
        this.size = 10;
    }

    setColor(color, key) {
        const lastColor = this.color;
        this.key = key;
        this.color = color;
        if (lastColor !== color) {
            const store = this.getStaticStore();
            store.length = 0;
        }
    }

    setDim(width, height) {
        this.width = width;
        this.height = height
    }

    getStorageKey() {
        return 'cursor3D.' + this.key + '|' + this.width + ':' + this.height;
    }

    getStaticStore() {
        return this.getStore(staticJobs, this.getStorageKey());
    }

    buildProgramJobs(gl) {
        const xo = this.width / 2 + this.size;
        const xi = this.width / 2;
        const yo = this.height / 2 + this.size;
        const yi = this.height / 2;

        return [{
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-xo, yo], [-xi, yi], [xi, yi], [xo, yo],
                        [-xo, -yo], [-xi, -yi], [xi, -yi], [xo, -yo]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT,[
                        this.color, this.color, this.color, this.color,
                        this.color, this.color, this.color, this.color
                    ]),
            },
            indices: this.getIndicesBuffer([
                0, 1, 3,
                1, 2, 3,
                0, 1, 5,
                4, 5, 0,
                2, 3, 6,
                6, 7, 3,
                4, 5, 6,
                6, 7, 4
            ])
        }]
    }
}

class Frame3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
        this.width = 1;
        this.height = 1;
    }

    setDim(width, height) {
        this.width = width;
        this.height = height
    }

    getDim() {
        return {width: this.width, height: this.height}
    }

    buildProgramJobs(gl) {
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;

        const min = Math.max(Math.min(10.0, this.width, this.height), Math.min(this.height * 0.1, this.width * 0.1));

        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [-hWidth + min, hHeight],
                        [-hWidth, hHeight - min],

                        [ hWidth, hHeight],
                        [ hWidth - min, hHeight],
                        [ hWidth, hHeight - min],

                        [ hWidth,-hHeight],
                        [ hWidth - min,-hHeight],
                        [ hWidth,-hHeight + min],

                        [-hWidth,-hHeight],
                        [-hWidth + min,-hHeight],
                        [-hWidth,-hHeight + min]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [
                        '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF',
                        '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF',
                        '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'
                    ])
            },
            indices: this.getIndicesBuffer(
                [
                        0, 1, 0, 2,
                        3, 4, 3, 5,
                        6, 7, 6, 8,
                        9, 10, 9, 11
                ]
            )
        }]
    }
}

class Pane3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
        this.width = 1;
        this.height = 1;
    }

    setDim(width, height) {
        this.width = width;
        this.height = height
    }

    getDim() {
        return {width: this.width, height: this.height}
    }

    getTextures() {
        return [{id: this.textureId, data: this.texture}];
    }

    setTexture(id, image = null) {
        this.textureId = id;
        this.texture = image;
    }

    buildProgramJobs(gl) {
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;

        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'])
            },
            indices: this.getIndicesBuffer([0, 1, 1, 2, 2, 3, 3, 0])
        }, {
            program: 'coordTexture|texture',
            type: gl.TRIANGLES,
            textures: [
                {id: this.textureId, wrap: gl.CLAMP_TO_EDGE, min_filter: gl.LINEAR}
            ],
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight]
                    ]),
                aTextureCoord:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array,
                        [
                            [0.0,  0.0],
                            [1.0,  0.0],
                            [1.0,  1.0],
                            [0.0,  1.0]
                        ]
                    )
            },
            indices: this.getIndicesBuffer([0, 1, 2, 0, 2, 3])
        }]
    }
}

class RevPane3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
        this.width = 1;
        this.height = 1
    }

    setDim(width, height) {
        this.width = width;
        this.height = height
    }

    getTextures() {
        return [{id: this.textureId, data: this.texture}];
    }

    setTexture(id, image = null) {
        this.textureId = id;
        this.texture = image;
    }

    buildProgramJobs(gl) {
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;

        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight],
                        [-hWidth, hHeight],
                        [ hWidth, hHeight]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'])
            },
            indices: this.getIndicesBuffer([0, 1, 1, 2, 2, 3, 3, 0])
        }, {
            program: 'coordTexture|texture',
            type: gl.TRIANGLES,
            textures: [
                {id: this.textureId, wrap: gl.CLAMP_TO_EDGE, min_filter: gl.LINEAR}
            ],
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight],
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                    ]),
                aTextureCoord:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array,
                        [
                            [1.0,  0.0],
                            [0.0,  0.0],
                            [0.0,  1.0],
                            [1.0,  1.0]
                        ]
                    )
            },
            indices: this.getIndicesBuffer([0, 1, 2, 0, 2, 3])
        }]
    }
}

class ColorPlane3D extends Object3D {

    constructor(props) {
        super(props);
        this.width = 1;
        this.height = 1
    }

    setDim(width, height) {
        this.width = width;
        this.height = height
    }

    getDim() {
        return {width: this.width, height: this.height}
    }

    setColor(color) {
        this.color = color
    }

    buildProgramJobs(gl) {
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;

        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFF88'])
            },
            indices: this.getIndicesBuffer([0, 1, 1, 2, 2, 3, 3, 0])
        }, {
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                        [ hWidth,-hHeight],
                        [-hWidth,-hHeight]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [this.color, this.color, this.color, this.color])
            },
            indices: this.getIndicesBuffer([0, 1, 2, 0, 2, 3])
        }]
    }
}

const MODE_2D = 0;
const MODE_3D = 1;

function Panes3D(props) {
    const [ mode, setMode ] = useCachedState('page', '3d', MODE_3D, 'number');
    const [ mirror, setMirror ] = useCachedState('page', 'mirror', true, 'bool');

    const options = [{id: MODE_2D, name: '2D'}, {id: MODE_3D, name: '3D'}];
    return (
        <Stack full vertical borders>
            <Toolbar>
                <Radio name="View:" options={options} value={mode} padded="h" set={setMode} />
                <Separator />
                <Checkbox name="Mirror" value={mirror} set={setMirror} />
            </Toolbar>
            <AvailContextProvider>
                <Panes3DInner mode={mode} mirror={mirror} { ...props } />
            </AvailContextProvider>
        </Stack>
    )
}

function Panes3DInner({ elemsRef, active, mode, mirror }) {
    const aContext = useContext(AvailContext);
    const wContext = useContext(WindowContext);

    const cursorRef = useRef(null);
    useTracker('tree', pos => cursorRef.current = pos.y);

    const { activeBgRgb, cursorBgRgba } = useCssProps('activeBgRgb', 'cursorBgRgba');

    const steps = 25;
    const start = -1.15;
    const delay = 0;

    const zDistStart = -0.0001;
    const zDistEnd = -50;

    const zStart = 0.0;
    const mPerc = 20;

    const [ currMode, setCurrMode ] = useState(mode);
    let [ posX, setPosX ] = useState(0.0);
    let [ posY, setPosY ] = useState(0.0);
    let [ posZ, setPosZ ] = useState(0.0);
    let [ rotX, setRotX ] = useState(347);
    let [ rotY, setRotY ] = useState(48);
    let [ rotZ, setRotZ ] = useState(0);
    let [ scale, setScale ] = useState(1.0);
    const [ wait4zSplit, setWait4zSplit ] = useState(-1);
    const [ zDist, setZDist ] = useState(zDistStart);
    const [ controls, setControls ] = useState(false);

    const zTargetRef = useRef({
        index: null,
        last: posZ,
        points: []
    });

    if (currMode !== mode) {
        setCurrMode(mode)
    }
    if (currMode === MODE_2D) {
        posX = 0;
        posY = 0;
        posZ = 0;
        rotX = 0;
        rotY = 0;
        rotZ = 0;
        scale = 1.0;
    }

    const alphaBlink = useMemo(() => {
        return getSinePath(0.25, 1.0, 20);
    }, []);
    const alphaRef = useRef({up: true, pos: 0});

    const maxPosZ = 25;
    const pushPositions = useMemo(() => {
        return getSinePath(zDistStart, zDistEnd, maxPosZ)
    }, []);
    const pullPositions = useMemo(() => {
        return getSinePath(zDistEnd, zDistStart, maxPosZ)
    }, []);

    const allUpRef = useRef(false);

    const panesRef = useRef([]);
    const propsRef = useRef(null);
    propsRef.current = {
        active, rotX, rotY, rotZ, posX, posY, posZ, scale, zDist, wait4zSplit,
        activeBgRgb, cursorBgRgba, height: aContext.height, mPerc, mirror
    };
    const scene = useMemo(() => {
        const scene = new Scene();
        scene.addVertexShader(coordTextureShader);
        scene.addVertexShader(coordColorShader);
        scene.addFragmentShader(textureShader);
        scene.addFragmentShader(colorShader);

        scene.addFragmentShader(colorInvertShader);
        scene.setZNear(-10000);
        scene.setZFar(10000);
        scene.setOrthognal();
        scene.setViewPosition([posX, posY, posZ]);
        scene.setViewRotation([rotX, rotY, rotZ]);
        scene.setViewScale(scale);

        const revRotate = [0, 0, 0];
        const noRotate = [0, 0, 0];

        const panes = [];
        const markerSize = 10;

        const elems = elemsRef.current;
        let maxHeight = 0;
        let maxWidth = 0;
        for (let item of elems) {
            maxWidth = Math.max(maxWidth, item.width);
            maxHeight = Math.max(maxHeight, item.height)
        }
        for (let i = elems.length - 1; i >= 0; i--) {
            let obj = null;
            let revObj = null;
            const elem = elems[i];
            const padding = (maxHeight - elem.height - elem.offY);
            const target = -((elem.height) / 2  + padding) - 2 * markerSize;
            if (elem.texture) {
                obj = new Pane3D();
                revObj = new RevPane3D({uMirror: 1});
                obj.setTexture('pane' + i, elem.texture);
                revObj.setTexture('pane' + i, elem.texture);
            } else if (elem.color) {
                obj = new ColorPlane3D();
                revObj = new ColorPlane3D({uMirror: 1});
                obj.setColor(elem.color ? elem.color : '#00000000');
                revObj.setColor(elem.color ? elem.color : '#00000000');
            } else {
                obj = new Frame3D();
                revObj = new Frame3D({uMirror: 1});
            }
            obj.setDim(elem.width, elem.height);
            revObj.setDim(elem.width, elem.height);

            const startX = (-maxWidth / 2 + elem.offX + elem.width / 2);
            const pane = scene.addObject(obj, [startX, target, zStart - (i * zDist)], noRotate);
            const revPane = scene.addObject(revObj, [startX, -target, zStart - (i * zDist)], revRotate);
            const yStart = target;
            const yEnd = -target;
            panes.push({
                active: i === 0,
                up: true,
                index: 0,
                elem,
                yPositions: getSinePath(yStart, yEnd, steps),
                zPos: elem.closed ? maxPosZ - 1 : 0,
                zDir: (i === 0 || elem.closed) ? 0 : 1,

                action: 'push',
                forward: true,
                actionPos: 0,

                level: elem.level,
                delay: delay * i,
                pane,
                revPane
            })
        }
        panesRef.current = panes;
        panes.reverse();

        const target = 1;
        const cursor = scene.addObject(new Cursor3D(), [0.0, target, 0.0], noRotate);
        cursor.setColor(cursorBgRgba.substr(0, 7), 'cursor');
        const revCursor = scene.addObject(new Cursor3D({uMirror: 1}), [0.0, -target, 0.0], revRotate);
        revCursor.setColor(cursorBgRgba.substr(0, 7), 'cursor');
        const marker = scene.addObject(new Cursor3D(), [0.0, target, 0.0], noRotate);
        marker.setColor(activeBgRgb, 'marker');
        const revMarker = scene.addObject(new Cursor3D({uMirror: 1}), [0.0, -target, 0.0], revRotate);
        revMarker.setColor(activeBgRgb, 'marker');

        scene.animate((gl, frame) => {
            const { active, rotX, rotY, rotZ, posX, posY, posZ, scale, height, mPerc, mirror,
                activeBgRgb, cursorBgRgba } = propsRef.current;

            if (wContext.isTransitioning()) return;

            const moveY = (height / 2 - (height * mPerc / 100));

            const space = height - (height * mPerc / 100);
            const zoom = space / (maxHeight + 50 + 2 * markerSize);

            scene.setOriginY(-moveY);
            scene.setOriginX(-150);
            scene.setViewPosition([posX, posY, posZ]);
            scene.setViewRotation([rotX, rotY, rotZ]);
            scene.setViewScale(zoom * scale);

            if (frame % 2 !== 0) return false;

            if (frame % 2 === 0) {
                const alpha = alphaRef.current;
                if (cursorRef.current === null || cursorRef.current === active) {
                    cursor.disable();
                    revCursor.disable()
                } else {
                    const cursorColors = staticJobs[cursor.getStorageKey()][0].attribs.aVertexColor.data;
                    for (let i = 3; i < cursorColors.length; i += 4) {
                        let newAlpha = hex2rgbaArray(cursorBgRgba)[3] * alphaBlink[alpha.pos];
                        cursorColors[i] = newAlpha
                    }
                    revCursor.setEnabled(mirror)
                }
                if (active === null) {
                    marker.disable();
                    revMarker.disable()
                } else {
                    const markerColors = staticJobs[marker.getStorageKey()][0].attribs.aVertexColor.data;
                    for (let i = 3; i < markerColors.length; i += 4) {
                        let newAlpha = alphaBlink[alpha.pos];
                        markerColors[i] = newAlpha
                    }
                    revMarker.setEnabled(mirror)
                }
                if (alpha.up) {
                    alpha.pos++;
                    if (alpha.pos === alphaBlink.length) {
                        alpha.pos--;
                        alpha.up = false
                    }
                } else {
                    alpha.pos--;
                    if (alpha.pos < 0) {
                        alpha.pos++;
                        alpha.up = true
                    }
                }
            }

            const cursorPos = cursorRef.current;
            let firstZ = null;

            let allUp = true;
            let i = -1;
            let lastZ = zStart;
            let closedLevel = null;

            for(let item of panes) {
                i++;
                const actionPositions = item.action === 'push' ?
                    pushPositions : pullPositions;
                let zIndex = 0;

                if (allUpRef.current) {

                    if (closedLevel !== null && item.level <= closedLevel) {
                        closedLevel = null
                    }
                    if (closedLevel === null && item.elem.closed) {
                        closedLevel = item.level;
                    }
                    const closed = closedLevel !== null && item.level > closedLevel;

                    if (closed && !(item.actionPos === null && item.action === 'push')) {
                        if (item.actionPos === null) {
                            item.actionPos = 0
                        } else {
                            if (item.action === 'push' && item.forward) {
                                item.forward = false
                            } else if (item.action === 'pull' && !item.forward) {
                                item.forward = true
                            }
                        }
                    }
                    if (!closed && !(item.actionPos === null && item.action === 'pull')) {
                        if (item.actionPos === null) {
                            item.actionPos = 0
                        } else {
                            if (item.action === 'pull' && item.forward) {
                                item.forward = false
                            } else if (item.action === 'push' && !item.forward) {
                                item.forward = true
                            }
                        }
                    }
                    if (item.actionPos !== null) {
                        let newIndex = item.actionPos;
                        let update = true;
                        if (item.forward) {
                            newIndex++;
                            if (newIndex === actionPositions.length) {
                                update = false;
                                zIndex = item.actionPos;
                                item.actionPos = null;
                                item.action = item.action === 'push' ? 'pull' : 'push';
                            }
                        } else {
                            newIndex--;
                            if (newIndex < 0) {
                                update = false
                                zIndex = item.actionPos;
                                item.actionPos = null;
                                item.forward = true;
                            }
                        }
                        if (update) {
                            zIndex = newIndex
                            item.actionPos = newIndex
                        }
                    }
                }
                const posZ = lastZ - (i === 0 ? 0 : actionPositions[zIndex]);
                if (firstZ === null && (i === cursorPos || cursorPos === null)) {
                    firstZ = cursorPos === null ? 0.0 : posZ
                }
                lastZ = posZ;
                item.pane.setPositionZ(posZ);
                item.revPane.setPositionZ(posZ);
                item.revPane.setEnabled(mirror);

                const {width: pWidth, height: pHeight} = item.pane.getDim();
                const pos = item.pane.getPosition();
                if (i === cursorPos && i !== active) {
                    cursor.enable();
                    revCursor.setEnabled(mirror);
                    cursor.setDim(pWidth, pHeight);
                    revCursor.setDim(pWidth, pHeight);
                    cursor.setColor(cursorBgRgba, 'cursor');
                    revCursor.setColor(cursorBgRgba, 'cursor');
                    cursor.setPosition([pos[0], pos[1], pos[2]]);
                    revCursor.setPosition([pos[0], pos[1], pos[2]]);
                }
                if (i === active) {
                    marker.enable();
                    revMarker.setEnabled(mirror);
                    marker.setDim(pWidth, pHeight);
                    revMarker.setDim(pWidth, pHeight);
                    marker.setColor(activeBgRgb, 'marker');
                    revMarker.setColor(activeBgRgb, 'marker');
                    marker.setPosition([pos[0], pos[1], pos[2]]);
                    revMarker.setPosition([pos[0], -pos[1], pos[2]])
                }
                if (item.delay > 0) {
                    item.delay--;
                    continue;
                }
                if (cursorPos !== null && i < cursorPos && item.up) {
                    item.up = false
                } else if (item.up === false && (cursorPos === null || i >= cursorPos)) {
                    item.up = true
                }

                if ((item.up && item.index >= steps - 1) || (!item.up && item.index === 0)) {
                    continue;
                }
                allUp = false;

                if (item.up) {
                    item.index++
                } else {
                    item.index--
                }
                const currY = item.yPositions[item.index];
                item.pane.setPositionY(currY);
                item.revPane.setPositionY(-currY)
            }

            const targetZ = -1.15 - firstZ;

            const target = zTargetRef.current;
            if (target.last !== targetZ) {
                target.index = 0;
                target.points = getSinePath(posZ, targetZ, 15);
                target.last = targetZ
            }
            if (target.index !== null) {
                setPosZ(target.points[target.index]);
                if (target.index < target.points.length - 1) {
                    target.index++
                }
            }
            scene.setViewPositionZ(posZ);

            if (allUp) {
                allUpRef.current = true
            }
            return true;
        });

        return scene
    }, []);

    const width = aContext.width;
    const height = aContext.height;

    const maxDist = 10.0;

    const restart = () => {
        const panes = panesRef.current;
        let i = 0;
        for (let item of panes) {
            item.index = 0;
            item.delay = i * delay;
            item.pane.setPositionY(start);
            item.revPane.setPositionY(-start);
            setWait4zSplit(-1);
            setZDist(zDistStart);
            i++
        }
    }

    const rotateByMouseMove = e => {
        wContext.startExclusiveMode('rotate3d', 'grabbing');
        const anchor = {
            x: e.clientX,
            rotY: propsRef.current.rotY,
            y: e.clientY,
            rotX: propsRef.current.rotX
        };
        wContext.addEventListener('mousemove', e => {
            setRotY(clamp(0, anchor.rotY - (anchor.x - e.clientX), 90));
            setRotX(clamp(270, anchor.rotX - (anchor.y - e.clientY), 360))
        });
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('rotate3d')
        })
    }
    return (
        <Overlays width={width} height={height}>
            <Overlay width={width} height={height}>
                <Scene3DCanvas
                    width={width} height={height}
                    scene={scene}
                />
            </Overlay>

            {mode === MODE_3D &&
                <Overlay width={width} height={height}>
                    <Block full cursor="grab" onLeftClick={rotateByMouseMove}>
                    {controls ?
                        <Stack vertical full>
                            <Block full="v" />
                            <Block full="h">
                                <Stack full="h" className="primary-bg primary-color" padded border={DIR.V}>
                                    <Block full centerItems="v" className="more">Controls</Block>
                                    <Button icon="close" onClick={() => setControls(false)}/>
                                </Stack>
                                <Toolbar>
                                    <Number name="PosX" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posX}
                                            set={setPosX}/>
                                    <Number name="PosY" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posY}
                                            set={setPosY}/>
                                    <Number name="PosZ" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posZ}
                                            set={setPosZ}/>
                                </Toolbar>
                                <Toolbar full="h">
                                    <Number name="RotX" slider="h" min={0} max={359} value={rotX} set={setRotX}/>
                                    <Number name="RotY" slider="h" min={0} max={359} value={rotY} set={setRotY}/>
                                    <Number name="RotZ" slider="h" min={0} max={359} value={rotZ} set={setRotZ}/>

                                    <Number name="Scale" decimals={2} slider="h" min={0.0} max={2.0} value={scale}
                                            set={setScale}/>
                                    <Button padded="h" onClick={restart} name="Restart"/>
                                </Toolbar>
                            </Block>
                        </Stack> :
                        <Stack full="h">
                            <Block full="h" className="transparent"/>
                            <Block padded><Button icon="3d_rotation" padded onClick={() => setControls(true)}/></Block>
                        </Stack>
                    }
                    </Block>
                </Overlay>
            }
        </Overlays>
    );
}

function getAreaNode(nodes, panes, items, props, level = 1) {
    if (panes) {
        for (let pane of items) {
            nodes.push({
                level,
                type: 'pane',
                name: Object.getPrototypeOf(pane).constructor.name,
                width: pane.viewPortDim.x,
                height: pane.viewPortDim.y,
                offX: props.x,
                offY: props.y,
                children: 0,
                last: true,
                id: pane.id,
                pane: pane
            });
        }
        return items.length
    }

    // no panes we have areas
    let added = 0;

    let offX = props.x;
    let offY = props.y;
    let width = props.width;
    let height = props.height;

    let i = -1;
    for(let item of items) {
        i++;
        if (props.sizes) {
            if (props.axis === 'X') {
                width = props.sizes[i]
            } else {
                height = props.sizes[i]
            }
        }
        let subNodes = 0;
        let parentNode = null;
        let parent = { level, width, height, offX, offY, last: i === items.length - 1, closed: false };
        let childProps = { width, height, x: offX, y: offY };
        if (Array.isArray(item)) {
            parentNode = { ...parent, type: 'area', name: 'Area' };
            nodes.push(parentNode);
            subNodes = getAreaNode(nodes,false, reverse(item), childProps, level + 1);
        } else if (item.axis) {
            parentNode = { ...parent, type: 'areas', name: item.axis + ' Split' };
            nodes.push(parentNode);
            subNodes = getAreaNode(nodes,false, item.areas, { ...childProps, axis: item.axis, sizes: item.areaSizes }, level + 1);
        } else if (item.panes) {
            parentNode = { ...parent, type: 'area', name: 'Area' };
            nodes.push(parentNode);
            subNodes = getAreaNode(nodes,true, reverse(item.panes), childProps, level + 1);
        }
        if (parentNode !== null) {
            parentNode.children = subNodes;
            subNodes++
        }
        if (props.sizes) {
            if (props.axis === 'X') {
                offX += width
            } else {
                offY += height
            }
        }
        added += subNodes
    }
    return added
}

function getResourceIndexByPane(resources, pane) {
    if (pane === undefined) return null;
    let index = 0;
    while (index < resources.length && resources[index].pane !== pane) {
        index++;
    }
    return index === resources.length ? null : index
}

function ScreenTree({ tree, stateChanges, toggle, resources, active, setActive, groups }) {
    const wContext = useContext(WindowContext);
    const editOp = {
        exec: ({ active }) => {
            const model = tree.getModelNodeById(active[0])
            const index = getResourceIndexByPane(resources, model.pane)
            wContext.stateForward(resources[index].type, {id: index});
        },
        can: ({ active }) => {
            if (active.length === 0) return false;
            const model = tree.getModelNodeById(active[0])
            const index = getResourceIndexByPane(resources, model.pane);
            return index !== null
        }
    };
    return (
        <Stack vertical full>
            <FullTree trackId="tree" filter
              stateChanges={stateChanges} toggleOp={toggle} collapse={true}
              editOp={editOp} doubleClickAction="edit" add delete active={active}
              setActive={setActive} tree={tree} groups={groups}
              cacheLevel="page" cacheId="screen_tree"
            />
        </Stack>
    )
}

function ScreenEditor({ resources, setSelected, ...props }) {
    const [ active, setActive ] = useState([]);
    const planesRef = useRef([]);

    const tree = useMemo(() => {
        const game = props.game;
        const screen = game.getCurrentScreen();
        const nodes = [];

        const innerNodes = [];
        getAreaNode(innerNodes,false, reverse(screen.areas), {width: game.width, height: game.height, x: 0, y: 0});
        nodes.push({type: 'Screen', name: screen.id, level: 0, last: true, children: innerNodes.length, closed: false, end: true, offX: 0, offY: 0, width: game.width, height: game.height});
        nodes.push( ...innerNodes );

        // assign planes
        let plane = 0;
        for (let node of nodes) {
            node.plane = plane;
            if (node.type === 'pane') {
                const index = getResourceIndexByPane(resources, node.pane);
                const elem = index !== null ? resources[index].elem : {texture: null};
                elem.offX = node.offX;
                elem.offY = node.offY;
                elem.width = node.width;
                elem.height = node.height;
                elem.level = node.level;
                elem.closed = false;
                elem.node = node;
                planesRef.current.push(
                    elem
                ) ;
                plane++
            } else {
                const elem = {texture: null};
                elem.offX = node.offX;
                elem.offY = node.offY;
                elem.width = node.width;
                elem.height = node.height;
                elem.level = node.level;
                elem.closed = false;
                elem.node = node;
                planesRef.current.push(
                    elem
                ) ;
                plane++
            }
        }
        return new ScreenTreeView(nodes)
    }, []);

    const toggleNode = ({ active }) => {
        const plane = planesRef.current[active];
        plane.closed = !plane.closed;
    };

    const stateChanges = changes => {
        for (let [id, value] of Object.entries(changes)) {
            const index = tree.getModelIndexById(id);
            planesRef.current[index].closed = value
        }
    }

    return (
        <EditorCtx id="screenEditor">
            <TrackingCtx object="tree">
                <Stack full border="1">
                    <Section id="screenTree" name="Screen" full="v" collapse="h" inner area={1} size={250} maxWidth="33%">
                        <ScreenTree tree={tree} stateChanges={stateChanges} groups={['panes']} setSelected={setSelected} toggle={toggleNode} active={active} setActive={setActive} resources={resources} />
                    </Section>

                    <Section name="Planes" full inner>
                        <Block full>
                            <Panes3D active={active.length === 0 ? null : tree.getModelNodeById(active[0]).plane} elemsRef={planesRef} game={props.game} />
                        </Block>
                    </Section>
                </Stack>
            </TrackingCtx>
        </EditorCtx>
    )
}

export {
    ScreenEditor
}