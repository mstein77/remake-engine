import React, { Fragment, useState, useContext, useRef, useEffect, useMemo } from "react";
import { Stack, Block, DIR } from "../components/LayoutComponents";
import { d, clamp, hex2rgb, hex2rgbaArray } from "../helper/helper";
import { Button, OkCancelForm, Number } from "../components/FormComponents";
import {
    useModal,
    Icon,
    useComponentUpdate,
    Kbd,
    ButtonStack,
    Canvas,
    useFocusElements,
    Toolbar,
    AvailContextProvider, AvailContext
} from "../components/BasicComponents";
import { ColorIndex } from "../classes/EntityIndex";
import { EntityStack } from "../components/EntityComponents";
import { Scene3DCanvas, Scene, Object3D } from "../components/WebGLComponents";
import { mat4 } from "gl-matrix";

function FocusMarker({ reset, items, page }) {
    const [ pos, setPos ] = useState(0);
    const [ active, setActive ] = useState(reset ? null : 0);

    const fElems = useFocusElements({ count: items.length, pos, handleSpace: true, setPos, active, setActive, page, reset });
    const elems = [];
    let i = pos;
    while (i <= fElems.last) {
        const curr = i;
        elems.push(
            <Block
                key={curr} onLeftClick={fElems.leftClick(curr)} tab={fElems.focusItem === curr}
                width={50} height={50} border="1" padded className={(active === curr ? 'active' : 'secondary') + '-bg'}>
                {curr}
            </Block>
        )
        i++
    }
    return (
        <Block { ...fElems.attr } className="stack-h padded inner-space-h">
            {elems}
        </Block>
    )
}

function FocusButtons({ items, reset }) {
    const [ active, setActive ] = useState(reset ? null : 0);

    const fElems = useFocusElements({ count: items.length, active, setActive, reset });
    const elems = [];
    let i = 0;
    while (i <= fElems.last) {
        const curr = i;
        const props = items[i];
        elems.push(
            <Button
                key={curr} current={active} value={i}
                onClick={fElems.leftClick(curr)}
                tab={fElems.focusItem === curr}
                padded="h"
                tabControlled
                { ...props }
            />
        );
        i++
    }
    return (
        <Block { ...fElems.attr } className="stack-h padded inner-space-h">
            {elems}
        </Block>
    )
}

// TODO: remove
function FastCanvas() {
    const sizeX = 2;
    const sizeY = 2;
    const cells = 100;
    const width = sizeX * cells;
    const height = sizeY * cells;
    const buffer = new ArrayBuffer((cells * cells) << 2);
    const colors32 = new Uint32Array(buffer);
    for (let y = 0; y < cells; y++ ) {
        for (let x = 0; x < cells; x++) {
            colors32[y * cells + x] = parseInt((x + y) % 2 === 0 ? 'F04040FF' : 'D0D0D0FF', 16);
        }
    }
    const render = ctx => {
        let pos = 0;
        let posY = 0;
        for (let y = 0; y < cells; y++) {
            let posX = 0;
            for (let x = 0; x < cells; x++) {
                ctx.fillStyle = '#' + colors32[pos].toString(16);
                ctx.fillRect(posX, posY, sizeX, sizeY);
                pos++;
                posX += sizeX;
            }
            posY += sizeY;
        }
    };
    return (
        <Block><Canvas border width={width} height={height} render={render} /></Block>
    );
}

function TestForm({close, save}) {
    return (
        <OkCancelForm full cancel={close} submit save={save}>
            Hello!
        </OkCancelForm>
    )
}

class Grid3D extends Object3D {
    buildProgramJobs(gl) {
        const points = [];
        const dist = 10;
        const fac = 0.05;

        let axisColor = '#FFFFFF'
        let color = '#00A080';
        const colors = [];

        for (let x = 0; x < dist; x++) {
            points.push([x * fac, 0, dist * fac]);
            points.push([x * fac, 0, -dist * fac])
            points.push([dist * fac, 0, x * fac]);
            points.push([-dist * fac, 0, x * fac])
            if (x === 0) {
                colors.push(axisColor, axisColor, axisColor, axisColor);
                continue;
            }
            colors.push(color, color, color, color);
            points.push([-x * fac, 0, dist * fac]);
            points.push([-x * fac, 0, -dist * fac]);
            points.push([dist * fac, 0, -x * fac]);
            points.push([-dist * fac, 0, -x * fac]);
            colors.push(color, color, color, color);
        }
        /*
        for (let y = 0; y < dist; y++) {
            points.push([dist * fac, y * fac, 0]);
            points.push([-dist * fac, y * fac, 0])
            if (y === 0) continue;
            points.push([dist * fac, -y * fac, 0]);
            points.push([-dist * fac, -y * fac, 0])
        }

         */


        axisColor = '#FF0000';
        for (let z = 0; z < dist; z++) {
            points.push([0, dist * fac, z * fac]);
            points.push([0, -dist * fac, z * fac])
            points.push([0, z * fac, dist * fac]);
            points.push([0, z * fac, -dist * fac])
            if (z === 0) {
                colors.push(axisColor, axisColor, axisColor, axisColor);
                continue;
            }
            colors.push(color, color, color, color);
            points.push([0, dist * fac, -z * fac]);
            points.push([0, -dist * fac, -z * fac])
            points.push([0, -z * fac, dist * fac]);
            points.push([0, -z * fac, -dist * fac]);
            colors.push(color, color, color, color);
        }

        //const colors = [];
        // while (colors.length < points.length) colors.push('#A0A0A0');

        const indices = [];
        let i = 0;
        while (indices.length < points.length) {
            indices.push(i);
            i++;
            indices.push(i);
            i++
        }

        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, points),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, colors)
            },
            indices: this.getIndicesBuffer(indices)
        }]
    }
}

class Cube3D extends Object3D {
    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array,
                        [
                            // Front face
                            [-1.0, -1.0,  1.0],
                            [1.0, -1.0,  1.0],
                            [1.0,  1.0,  1.0],
                            [-1.0,  1.0,  1.0],

                            // Back face
                            [-1.0, -1.0, -1.0],
                            [-1.0,  1.0, -1.0],
                            [1.0,  1.0, -1.0],
                            [1.0, -1.0, -1.0],

                            // Top face
                            [-1.0,  1.0, -1.0],
                            [-1.0,  1.0,  1.0],
                            [1.0,  1.0,  1.0],
                            [1.0,  1.0, -1.0],

                            // Bottom face
                            [-1.0, -1.0, -1.0],
                            [1.0, -1.0, -1.0],
                            [1.0, -1.0,  1.0],
                            [-1.0, -1.0,  1.0],

                            // Right face
                            [1.0, -1.0, -1.0],
                            [1.0,  1.0, -1.0],
                            [1.0,  1.0,  1.0],
                            [1.0, -1.0,  1.0],

                            // Left face
                            [-1.0, -1.0, -1.0],
                            [-1.0, -1.0,  1.0],
                            [-1.0,  1.0,  1.0],
                            [-1.0,  1.0, -1.0],
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [
                        '#FF0000', '#FF0000', '#FF0000', '#FF0000',
                        '#FFFF00', '#FFFF00', '#FFFF00', '#FFFF00',
                        '#FF00FF', '#FF00FF', '#FF00FF', '#FF00FF',
                        '#00FF00', '#00FF00', '#00FF00', '#00FF00',
                        '#00FFFF', '#00FFFF', '#00FFFF', '#00FFFF',
                        '#FFF0F0', '#FFF0F0', '#FFF0F0', '#FFF0F0',
                    ])
            },
            indices: this.getIndicesBuffer([
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
                12, 13, 14,     12, 14, 15,   // bottom
                16, 17, 18,     16, 18, 19,   // right
                20, 21, 22,     20, 22, 23,   // left
            ])
        }]
    }
}

class Something3D extends Object3D {
    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [1, 0, 1], [1, 1, 0], [0, 1, 0]]),
                aVertexColor:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [[1, 1, 0, 1], [1, 0, 0, 1], [0, 1, 0, 1]]),
            },
            indices: this.getIndicesBuffer([0, 1, 2])
        }]
    }
}

class Axis3D extends Object3D {
    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1]]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT,['#880000', '#880000', '#008800', '#008800', '#000088', '#000088']),
            },
            indices: this.getIndicesBuffer([0, 1, 2, 3, 4, 5])
        }]
    }
}

class AxisDir3D extends Object3D {
    constructor(size) {
        super();
        this.size = size;
    }

    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [[0, 0, 0], [this.size, 0, 0], [0, 0, 0], [0, this.size, 0], [0, 0, 0], [0, 0, this.size]]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT,['#F00000', '#F00000', '#00F000', '#00F000', '#8080F0', '#8080F0']),
            },
            indices: this.getIndicesBuffer([0, 1, 2, 3, 4, 5])
        }]
    }
}


const staticJobs = {};

class LineRect3D extends Object3D {
    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-1, 1, 0], [1, 1, 0], [1, -1, 0], [-1, -1, 0]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [
                        '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'
                    ])
            },
            indices: this.getIndicesBuffer([
                0, 1, 1, 2, 2, 3, 3, 0
            ])
        }]
    }
}

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

class Cursor3D2 extends Object3D {

    setColor(color) {
        this.color = color;
    }

    getStaticStore() {
        return this.getStore(staticJobs, 'cursor3D');
    }

    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-OD, OD], [-ID, ID], [ID, ID], [OD, OD],
                        [-OD, -OD], [-ID, -ID], [ID, -ID], [OD, -OD]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT,[
                        this.color, this.color, this.color, this.color, this.color, this.color, this.color, this.color
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

class Screen3D extends Object3D {

    constructor(width, height, color = '#FFFFFF') {
        super();
        this.width = width;
        this.height = height;
        this.color = color;
    }

    setColor(color) {
        this.color = color;
    }

    buildProgramJobs(gl) {
        const hWidth = this.width / 2;
        const hHeight = this.height / 2;
        return [{
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-hWidth, hHeight],
                        [ hWidth, hHeight],
                        [ hWidth, -hHeight],
                        [-hWidth, -hHeight]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [this.color, this.color, this.color, this.color, this.color])
            },
            indices: this.getIndicesBuffer([0, 1, 2, 0, 2, 3])
        }]
    }
}


class Pane3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
        this.color = '#FFFFFF';
    }

    setColor(color) {
        this.color = color;
    }

    getTextures() {
        return [{id: this.textureId, data: this.texture}];
    }

    setTexture(id, image = null) {
        this.textureId = id;
        this.texture = image;
    }

    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            blend: this.blend,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-1.0, 1.0],
                        [ 1.0, 1.0],
                        [ 1.0,-1.0],
                        [-1.0,-1.0]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', this.color, this.color, this.color, this.color])
            },
            indices: this.getIndicesBuffer([0, 1, 1, 2, 2, 3, 3, 0])
        }]
    }
}

class RevPane3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
        this.color = '#FFFFFF';
    }

    setColor(color) {
        this.color = color;
    }

    getTextures() {
        return [{id: this.textureId, data: this.texture}];
    }

    setTexture(id, image = null) {
        this.textureId = id;
        this.texture = image;
    }

    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [ 1.0,-1.0],
                        [-1.0,-1.0],
                        [-1.0, 1.0],
                        [ 1.0, 1.0]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', this.color, this.color, this.color, this.color])
            },
            indices: this.getIndicesBuffer([0, 1, 1, 2, 2, 3, 3, 0])
        }]
    }
}


function TestScene() {
    return (
        <AvailContextProvider>
            <TestSceneInner />
        </AvailContextProvider>
    )
}

function TestSceneInner({  }) {
    let { width, height } = useContext(AvailContext);

    const mPerc = 25;

    const [ rotX, setRotX ] = useState(347);
    const [ rotY, setRotY ] = useState(48);
    const [ rotZ, setRotZ ] = useState(0);
    const [ posX, setPosX ] = useState(0.0);
    const [ posY, setPosY ] = useState(0.0);
    const [ posZ, setPosZ ] = useState(0.0);
    const [ scaleX, setScaleX ] = useState(1.0);
    const [ scaleY, setScaleY ] = useState(1.0);
    const [ scaleZ, setScaleZ ] = useState(1.0);
    const [ objRotX, setObjRotX ] = useState(0);
    const [ objRotY, setObjRotY ] = useState(0);
    const [ objRotZ, setObjRotZ ] = useState(0);
    const [ maxPixel, setMaxPixel ] = useState(500);

    const maxDist = 100.0;

    const propsRef = useRef(null);
    propsRef.current = { height, maxPixel, objRotX, objRotY, objRotZ, rotX, rotY, rotZ, posX, posY, posZ, scaleX, scaleY, scaleZ };

    const scene = useMemo(() => {
        const scene = new Scene();
        scene.setOrthognal();
        scene.addVertexShader({
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
        });
        scene.addVertexShader({
            id: 'coordColor',
            source: `
                attribute vec4 aVertexPosition;
                attribute vec4 aVertexColor;
            
                uniform mat4 uModelMatrix;
                uniform mat4 uViewMatrix;
                uniform mat4 uProjectionMatrix;
                uniform mat4 uOriginMatrix;
            
                varying lowp vec4 vColor;
                             
                void main(void) {
                    gl_Position = uProjectionMatrix * uOriginMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
                    vColor = aVertexColor;
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
        });
        scene.addFragmentShader({
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
//                          gl_FragColor = vec4(gl_FragColor.rgb, (0.6 * gl_FragCoord.y/100.0) * gl_FragColor.a);
                          gl_FragColor = vec4(gl_FragColor.rgb, 0.6 * gl_FragColor.a);
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
        });
        scene.addFragmentShader({
            id: 'color',
            source: `
                varying lowp vec4 vColor;
                              
                void main(void) {
                  gl_FragColor = vColor;
                }
            `,
            uniforms: [
                {name: 'uMirror', func: 'uniform1i', default: 0},
            ]
        })

        const markerSize = 10;

        const axis = scene.addObject(new AxisDir3D(100), [0, 0, 0], [0, 0, 0], [2, 2, 2]);
        const screen = scene.addObject(new Screen3D(320, 100), [160, markerSize * 2 + 50, 0], [0, 0, 0,]);
        screen.debugAs('screen');
        scene.addObject(new Screen3D(320, 200, '#FF0044'), [160, markerSize * 2 + 50, 50], [0, 0, 0,]);
        scene.debugAs('Scene!');
        const cursor = scene.addObject(new Cursor3D());
        cursor.setColor('#00FF00');
        cursor.setDim(320, 100);
        cursor.setPosition(screen.getPosition());
        let dirDown = true;

        // scene.setViewScale(Math.min(width, height) / Math.max(width, height));


        scene.animate((gl, frame) => {
            const { height, maxPixel, objRotX, objRotY, objRotZ, rotX, rotY, rotZ, posX, posY, posZ, scaleX } = propsRef.current;

            // const zoomPerPixel = 2 * scene.getBaseZoom() / height;
            const moveY = (height / 2 - (height * mPerc / 100));

            const space = height - (height * mPerc / 100);
            const zoom = space / (250 + 2 * markerSize);

            // ViewportPixel:
            // x / height = 10 / 100 <=>
            // x = height / 2 - p * height / 100
            // height / 2 = 160 - 10
            scene.setOriginY(-moveY);
            scene.setOriginX(-150);
            scene.setViewPosition([posX, posY, posZ]);
            scene.setViewRotation([rotX, rotY, rotZ]);
            scene.setViewScale(zoom);

            if (frame % 1) {
                return false;
            }
            return true;
        });

        return scene
    }, []);

    const fov = scene.getFieldOfView();
    const update = useComponentUpdate();

    return (
        <Stack full>
            <Block border="1" full>
                <Scene3DCanvas
                    width={width} height={height}
                    scene={scene}
                />
            </Block>
            <Stack vertical full="v" width={200}>
                <Toolbar full="h">
                    <Number name="FoV" slider="h" min={0} max={359} value={fov} set={value => {scene.setFieldOfView(value); update()}} />
                    <Number name="zNear" slider="h" decimals={1} min={-1000.0} max={1000.0} value={scene.getZNear()} set={value => {scene.setZNear(value); update()}} />
                    <Number name="zFar" slider="h" decimals={1} min={0.0} max={1000.0} value={scene.getZFar()} set={value => {scene.setZFar(value); update()}} />
                </Toolbar>
                <Toolbar>
                    <Number name="PosX" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posX} set={setPosX} />
                    <Number name="PosY" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posY} set={setPosY} />
                    <Number name="PosZ" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posZ} set={setPosZ} />
                </Toolbar>
                <Toolbar>
                    <Number name="RotX" slider="h" min={0} max={359} value={rotX} set={setRotX} />
                    <Number name="RotY" slider="h" min={0} max={359} value={rotY} set={setRotY} />
                    <Number name="RotZ" slider="h" min={0} max={359} value={rotZ} set={setRotZ} />
                </Toolbar>
                <Toolbar>
                    <Number name="MaxPixel" slider="h" min={10} max={999} set={setMaxPixel} value={maxPixel} />
                    <Number name="ScaleX" slider="h" decimals={2} min={0.0} max={2.0} value={scaleX} set={setScaleX} />
                </Toolbar>
                <Toolbar>
                    <Number name="ObjRotX" slider="h" min={0} max={359} value={objRotX} set={setObjRotX} />
                    <Number name="ObjRotY" slider="h" min={0} max={359} value={objRotY} set={setObjRotY} />
                    <Number name="ObjRotZ" slider="h" min={0} max={359} value={objRotZ} set={setObjRotZ} />
                </Toolbar>
            </Stack>
        </Stack>
    )
}

/**
 * TODO:
 *
 *
 *   a) hotkey behaviour
 *       - add
 *       - delete
 *
 *   b) id-strings
 *
 *
 * @returns {JSX.Element}
 * @constructor
 */
function PocEditor() {
    const TestModal = useModal();
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const items1 = ['x'];
    const [x ,setX ] = useState(true);
    const buttons = [
        {name: 'Hey'},
        {name: 'Right'},
        {name: 'Here!'}
    ];
    const buttons3 = [
        {name: 'Hey', onClick: {exec: () => setX(false), can: () => x}},
        {name: 'Right', onClick: () => setX(true), onClickEnd: () => {d('END?')}},
        {name: 'Here!', onClick: () => {
            TestModal.open({
                save: () => {
                    TestModal.close()
                }
            });
            }
        }
    ];
    const buttons2 = [
        {name: 'Hey'}, {name: 'Right'}, {name: 'Here!'},
        {name: 'Hey2', disabled: true}, {name: 'Right2'}, {name: 'Here!2'},
    ];

    const colIndex = useMemo(() => {
        return new ColorIndex({colors: ['#FFFFFF00', '#00000000', '#888888FF']});
    }, [])

    /*
            <TestScene />

     */

    return (
        <Stack vertical gaps full>

            <Block full="h" border="1">
                <EntityStack
                    entityIndex={colIndex}
                />
            </Block>
            <FocusMarker items={items1} reset page={3} />
            <FocusMarker items={items} page={3} />
            <FocusMarker items={items} page={10} reset />
            <FocusMarker items={items} reset />

            <FocusButtons items={buttons} page={10} />
            <FocusButtons items={buttons2} page={10} />

            <ButtonStack
                gaps="1" buttons={buttons3} buttonProps={{padded: 'h'}} />

            <TestModal.content width={200} height={200}>
                <TestForm { ...TestModal.props } />
            </TestModal.content>

        </Stack>
    )
}

export {
    PocEditor
}