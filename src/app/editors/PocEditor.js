import React, { Fragment, useState, useContext, useRef, useEffect, useMemo } from "react";
import { Stack, Block, DIR } from "../components/LayoutComponents";
import { d, clamp, hex2rgb, hex2rgbaArray } from "../helper/helper";
import { Button, OkCancelForm, Number } from "../components/FormComponents";
import { useModal, Icon, useComponentUpdate, Kbd, ButtonStack, Canvas, useFocusElements, Toolbar } from "../components/BasicComponents";
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
    buildProgramJobs(gl) {
        return [{
            program: 'coordColor|color',
            type: gl.LINES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [[0, 0, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 0, 1]]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT,['#F00000', '#F00000', '#00F000', '#00F000', '#8080F0', '#8080F0']),
            },
            indices: this.getIndicesBuffer([0, 1, 2, 3, 4, 5])
        }]
    }
}


const OD = 1.1;
const ID = 1.0;
const COL = '#FF0000'; // '#35948e';

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
                        COL, COL, COL, COL, COL, COL, COL, COL
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

class Pane3D extends Object3D {

    constructor(uniforms = {}) {
        super({ ...uniforms, uSampler: 0 });
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
                        [-1.0, 1.0],
                        [ 1.0, 1.0],
                        [ 1.0,-1.0],
                        [-1.0,-1.0]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFF88'])
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
                        [-1.0, 1.0],
                        [ 1.0, 1.0],
                        [ 1.0,-1.0],
                        [-1.0,-1.0]
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

function TestScene({  }) {

    const [ rotX, setRotX ] = useState(320);
    const [ rotY, setRotY ] = useState(50);
    const [ rotZ, setRotZ ] = useState(30);
    const [ posX, setPosX ] = useState(0.0);
    const [ posY, setPosY ] = useState(0.0);
    const [ posZ, setPosZ ] = useState(0.0);
    const [ scaleX, setScaleX ] = useState(0.8);
    const [ scaleY, setScaleY ] = useState(0.8);
    const [ scaleZ, setScaleZ ] = useState(0.8);

    const maxDist = 100.0;

    const propsRef = useRef(null);
    propsRef.current = { rotX, rotY, rotZ, posX, posY, posZ, scaleX, scaleY, scaleZ };

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
            
                varying highp vec2 vTextureCoord;
                varying highp float yDist;

                highp vec4 zeroVector; 
                             
                void main(void) {
                  zeroVector = aVertexPosition;
                  zeroVector = uModelMatrix * zeroVector;

                  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
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
                {name: 'uProjectionMatrix', func: 'uniformMatrix4fv'}
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
            
                varying highp float yDist;                
                varying lowp vec4 vColor;
                             
                highp vec4 zeroVector; 
                highp vec4 compVector;

                void main(void) {
                  zeroVector = aVertexPosition;
                  zeroVector = uModelMatrix * zeroVector;
                
                  compVector = uModelMatrix * 
                    aVertexPosition;
                  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * 
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
                {name: 'uProjectionMatrix', func: 'uniformMatrix4fv'}
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
                varying highp float yDist;
                uniform int uMirror;
                              
                void main(void) {
                  if (uMirror > 0) {
                      if (yDist > 0.0) {
                          discard;
                      } else {
//                          gl_FragColor = vec4(vColor.rgb, (0.6 * gl_FragCoord.y/100.0) * vColor.a);
                          gl_FragColor = vec4(vColor.rgb, 0.5 * vColor.a);
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
        })
//        scene.addObject(new Pane3D(), [0.0, 1.2, -3.1], [0, 45, 0], [1.5, 0.8, 0]);
//        scene.addObject(new Pane3D({uMirror: 1}), [0.0, -1.2, -3.1], [180, -45, 0], [1.5, 0.8, 0]);

        const dist = 1;
        const pane = scene.addObject(new Pane3D(), [0, 0.2, 0], [0, 0, 0], [scaleX, scaleX, scaleX]);
        const pane_m = scene.addObject(new Pane3D({uMirror: 1}), [0, -0.2, 0], [0, 180, 0], [scaleX, scaleX, scaleX]);

        const axis = scene.addObject(new AxisDir3D(), [0, 0, 0], [0, 0, 0]);

        /*
        const pane = scene.addObject(new Pane3D(), [0.0, 1.2, -7.1], [0, 45, 0], [1.5, 0.8, 0]);
        const pane2 = scene.addObject(new Pane3D({uMirror: 1}), [0.0, -1.2, -7.1],[180, -45, 0], [1.5, 0.8, 0]);

        scene.addObject(new Pane3D(), [0.0, 1.2, -12.1], [0, 45, 0], [1.2, 0.8, 0]);
        scene.addObject(new Pane3D({uMirror: 1}), [0.0, -1.2, -12.1],[180, -45, 0], [1.2, 0.8, 0]);

        const cursor = scene.addObject(new Cursor3D(), [0.0, 1.2, -7.1], [0, 45, 0], [1.5, 0.8, 0]);
        const cursor2 = scene.addObject(new Cursor3D({uMirror: 1}), [0.0, -1.2, -7.1], [180, -45, 0], [1.5, 0.8, 0]);

        // scene.addObject(new Axis3D(), [0.0, 0.0, -6.1]);

        /*
        scene.addObject(new Cube3D(), [0.0, 0.5, -6], [40, 10, 5], [0.3, 0.3, 0.3]);

        scene.addObject(new Cube3D(), [0.0, -0.5, -6], [40, -170, 5], [0.1, 0.1, 0.1]);

        /*
        scene.addObject(new Something3D(), [0.0, 0.0, -6.0])
        scene.addObject(new Something3D(), [-0.5, 0.0, -6.0], [0.5, 0.0, 0,0])
*/
        let dirDown = true;

        scene.animate((gl, frame) => {
            const { rotX, rotY, rotZ, posX, posY, posZ, scaleX } = propsRef.current;

            scene.setViewPosition([posX, posY, posZ]);
            scene.setViewRotation([rotX, rotY, rotZ]);


            if (frame % 1) {
                return false;
            }
            /*
            const colors = staticJobs['cursor3D'][0].attribs.aVertexColor.data;
            for (let i = 3; i < colors.length; i += 4) {
                let newAlpha = colors[i] - 0.05;
//                colors[i] = (newAlpha < 0) ? 1.0 : newAlpha
            }
*/
            const currY = pane.getPositionY();
            if (dirDown) {
                if (currY < -1.1) dirDown = false;
            } else if (currY > 2.0) dirDown = true;

            const transY = 0.01 * (dirDown ? -1 : 1);
            pane.translate({y: transY});
  //          cursor.translate({y: transY});
            pane_m.translate({y: -transY});
//            cursor2.translate({y: -transY})

            return true;
        });

        return scene
    }, []);

    const fov = scene.getFieldOfView();
    const update = useComponentUpdate();

    return (
        <Stack vertical full="h" height={700}>
            <Block full>
                <Block border="1">
                    <Scene3DCanvas
                        width={800} height={600}
                        scene={scene}
                    />
                </Block>
            </Block>
            <Toolbar>
                <Number name="FoV" slider="h" min={0} max={359} value={fov} set={value => {scene.setFieldOfView(value); update()}} />
                <Number name="zNear" slider="h" decimals={1} min={-100.0} max={999.0} value={scene.getZNear()} set={value => {scene.setZNear(value); update()}} />
                <Number name="zFar" slider="h" decimals={1} min={0.0} max={999.0} value={scene.getZFar()} set={value => {scene.setZFar(value); update()}} />
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
                <Number name="ScaleX" slider="h" decimals={2} min={0.0} max={100.0} value={scaleX} set={setScaleX} />
            </Toolbar>
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
        <Stack vertical gaps>

            <TreeStack />

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