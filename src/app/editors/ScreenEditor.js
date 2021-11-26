import {
    AvailContext,
    AvailContextProvider,
    Icon,
    Kbd,
    Section,
    Toolbar, useCssProps, WindowContext
} from "../components/BasicComponents";
import React, { Fragment, useContext, useMemo, useRef, useState } from "react";
import {Object3D, Scene, Scene3DCanvas} from "../components/WebGLComponents";
import { Block, Grid, Overlay, Overlays, Stack } from "../components/LayoutComponents";
import { Button, Number } from "../components/FormComponents";
import { TreeStack } from "../components/EntityComponents";
import { d } from "../helper/helper";

const OD = 1.1;
const ID = 1.0;

const staticJobs = {};

class Cursor3D extends Object3D {

    setColor(color) {
        this.color = color
    }

    getStaticStore() {
        return this.getStore(staticJobs, 'cursor3D.' + this.color);
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

class ColorPlane3D extends Object3D {

    setColor(color) {
        this.color = color
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
            program: 'coordColor|color',
            type: gl.TRIANGLES,
            attribs: {
                aVertexPosition:
                    this.getFlatArrayBuffer(gl.FLOAT, Float32Array, [
                        [-1.0, 1.0],
                        [ 1.0, 1.0],
                        [ 1.0,-1.0],
                        [-1.0,-1.0]
                    ]),
                aVertexColor:
                    this.getColorBuffer(gl.FLOAT, [this.color, this.color, this.color, this.color])
            },
            indices: this.getIndicesBuffer([0, 1, 2, 0, 2, 3])
        }]
    }
}


function Panes3D(props) {
    return (
        <AvailContextProvider>
            <Panes3DInner { ...props } />
        </AvailContextProvider>
    )
}

function Panes3DInner({ elems, active }) {
    const aContext = useContext(AvailContext);
    const cursorPos = 2;

    const { activeBgRgb, cursorBgRgba } = useCssProps('activeBgRgb', 'cursorBgRgba');

    const steps = 25;
    const start = -1.0;
    const end = 1.1;
    const delay = 0;
    const zDistStart = 0.01;
    const zDistEnd = 0.5;
    const zStart = -1.5;

    const [ posX, setPosX ] = useState(0.4);
    const [ posY, setPosY ] = useState(1.2);
    const [ posZ, setPosZ ] = useState(0.0);
    const [ rotX, setRotX ] = useState(333);
    const [ rotY, setRotY ] = useState(18);
    const [ rotZ, setRotZ ] = useState(9);
    const [ scale, setScale ] = useState(0.5);
    const [ wait4zSplit, setWait4zSplit ] = useState(-1);
    const [ zDist, setZDist ] = useState(zDistStart);

    const zPositions = useMemo(() => {
        const positions = [];
        const zSteps = 40;
        const zRadSteps = 0.5 * Math.PI / (zSteps + 1);
        const dist = Math.abs(zDistEnd - zDistStart);
        for (let i = 0; i < zSteps; i++) {
            positions.push(Math.sin(zRadSteps * i) * dist + zDistStart);
        }
        return positions
    }, []);

    const panesRef = useRef([]);
    const propsRef = useRef(null);
    propsRef.current = { active, rotX, rotY, rotZ, posX, posY, posZ, scale, zDist, wait4zSplit };

    const mirror = 0.8;
    const aspect = 320 / 256;

    const scene = useMemo(() => {
        const scene = new Scene();
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
//                          gl_FragColor = vec4(gl_FragColor.rgb, (${mirror} * gl_FragCoord.y/100.0) * gl_FragColor.a);
                          gl_FragColor = vec4(gl_FragColor.rgb, ${mirror} * gl_FragColor.a);
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
//                          gl_FragColor = vec4(vColor.rgb, (${mirror} * gl_FragCoord.y/100.0) * vColor.a);
                          gl_FragColor = vec4(vColor.rgb, ${mirror} * vColor.a);
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
        });

        scene.setOrthognal();
        scene.setViewPosition([posX, posY, posZ]);
        scene.setViewRotation([rotX, rotY, rotZ]);
        scene.setViewScale(scale);

        const positions = [];
        const radSteps = 0.5 * Math.PI / (steps + 1);
        const dist = Math.abs(end - start);
        for (let i = 0; i < steps; i++) {
            positions.push(Math.sin(radSteps * i) * dist + start);
        }

        const panes = [];
        for (let i = elems.length - 1; i >= 0; i--) {
            let obj = null;
            let revObj = null;
            const elem = elems[i];
            if (elem.texture) {
                obj = new Pane3D();
                revObj = new Pane3D({uMirror: 1});
                obj.setTexture('pane' + i, elem.texture);
                revObj.setTexture('pane' + i, elem.texture)
            } else {
                obj = new ColorPlane3D();
                revObj = new ColorPlane3D({uMirror: 1});
                obj.setColor(elem.color ? elem.color : '#00000000');
                revObj.setColor(elem.color ? elem.color : '#00000000');
            }
            const pane = scene.addObject(obj, [0.0, -1.0, zStart - (i * zDist)], [0, 45, 0], [0.8 * aspect, 0.8, 0]);
            const revPane = scene.addObject(revObj, [0.0, 1.0, zStart - (i * zDist)],[180, -45, 0], [0.8 * aspect, 0.8, 0]);
            panes.push({
                active: i === 0,
                up: true,
                index: 0,
                delay: delay * i,
                pane,
                revPane
            })
        }
        panesRef.current = panes;
        panes.reverse();

        const cursor = scene.addObject(new Cursor3D(), [0.0, -0.6, 0.0], [0, 45, 0], [0.8 * aspect, 0.8, 0]);
        cursor.setColor(cursorBgRgba.substr(0, 7));
        const revCursor = scene.addObject(new Cursor3D({uMirror: 1}), [0.0, 0.6, 0.0], [180, -45, 0], [0.8 * aspect, 0.8, 0]);
        revCursor.setColor(cursorBgRgba.substr(0, 7));
        const marker = scene.addObject(new Cursor3D(), [0.0, -0.6, 0.0], [0, 45, 0], [0.8 * aspect, 0.8, 0]);
        marker.setColor(activeBgRgb);
        const revMarker = scene.addObject(new Cursor3D({uMirror: 1}), [0.0, -0.6, 0.0], [180, -45, 0], [0.8 * aspect, 0.8, 0]);
        revMarker.setColor(activeBgRgb);

        scene.animate((gl, frame) => {
            const { active, rotX, rotY, rotZ, posX, posY, posZ, scale, zDist, wait4zSplit } = propsRef.current;

            scene.setViewRotation([rotX, rotY, rotZ]);
            scene.setViewPosition([posX, posY, posZ]);
            scene.setViewScale(scale);

            if (frame % 2 !== 0) return false;

            if (frame % 2 === 0) {
                if (cursorPos === null) {
                    cursor.disable();
                    revCursor.disable()
                }
                if (active === null) {
                    marker.disable();
                    revMarker.disable()
                } else {
                    const cursorColors = staticJobs['cursor3D.' + cursorBgRgba.substr(0, 7)][0].attribs.aVertexColor.data;
                    for (let i = 3; i < cursorColors.length; i += 4) {
                        let newAlpha = cursorColors[i] - 0.05;
                        cursorColors[i] = (newAlpha < 0) ? 1.0 : newAlpha
                    }
                    const markerColors = staticJobs['cursor3D.' + activeBgRgb][0].attribs.aVertexColor.data;
                    for (let i = 3; i < markerColors.length; i += 4) {
                        let newAlpha = markerColors[i] - 0.05;
                        markerColors[i] = (newAlpha < 0) ? 1.0 : newAlpha
                    }
                }
            }

            let allUp = true;
            let i = -1;
            for(let item of panes) {
                i++;
                item.pane.setPositionZ(-1.5 - i * zDist);
                item.revPane.setPositionZ(-1.5 - i * zDist);

                const pos = item.pane.getPosition();
                if (i === cursorPos && i !== active) {
                    cursor.enable();
                    revCursor.enable()
                    cursor.setPosition([pos[0], pos[1], pos[2]]);
                    revCursor.setPosition([pos[0], -pos[1], pos[2]])
                }

                if (i === active) {
                    marker.enable();
                    revMarker.enable()
                    marker.setPosition([pos[0], pos[1], pos[2]]);
                    revMarker.setPosition([pos[0], -pos[1], pos[2]])
                }

                if (item.delay > 0) {
                    item.delay--;
                    continue;
                }
                if (active !== null && i < active && item.up) {
                    item.up = false
                } else if (item.up === false && (active === null || i >= active)) {
                    item.up = true
                }
                if ((item.up && item.index >= steps) || (!item.up && item.index === -1)) {
                    continue;
                }
                allUp = false;
                const currY = positions[item.index];
                item.pane.setPositionY(currY);
                item.revPane.setPositionY(-currY)
                if (item.up) {
                    item.index++
                } else {
                    item.index--
                }
            }
            if (allUp) {
                if (wait4zSplit === -1) {
                    setWait4zSplit(0);
                } else if (wait4zSplit < zPositions.length) {
                    setZDist(zPositions[wait4zSplit]);
                    setWait4zSplit(wait4zSplit + 1)
                }
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

    return (
        <Overlays width={width} height={height}>
            <Overlay width={width} height={height}>
                <Scene3DCanvas
                    width={width} height={height}
                    scene={scene}
                />
            </Overlay>

            <Overlay width={600} height={120}>
                <Block full>
                    <Toolbar>
                        <Number name="PosX" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posX} set={setPosX} />
                        <Number name="PosY" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posY} set={setPosY} />
                        <Number name="PosZ" decimals={1} slider="h" min={-maxDist} max={maxDist} value={posZ} set={setPosZ} />
                    </Toolbar>
                    <Toolbar full="h">
                        <Number name="RotX" slider="h" min={0} max={359} value={rotX} set={setRotX} />
                        <Number name="RotY" slider="h" min={0} max={359} value={rotY} set={setRotY} />
                        <Number name="RotZ" slider="h" min={0} max={359} value={rotZ} set={setRotZ} />

                        <Number name="Scale" decimals={2} slider="h" min={0.0} max={20.0} value={scale} set={setScale} />
                        <Button padded="h" onClick={restart} name="Restart" />
                    </Toolbar>
                </Block>
            </Overlay>
        </Overlays>
    );
}

function getAreaNodes(areas, level = 1, nodes = []) {
    const revAreas = areas.reverse();
    for(let area of revAreas) {
        if (area.axis) {
            nodes.push({level, type: 'areas', name: area.axis.toUpperCase() + ' Split', axis: area.axis});
            const subAreas = area.areas;
            for(let subArea of subAreas) {
                getAreaNodes(subArea, level + 1, nodes);
            }
        } else if (area.panes) {
            const panes = area.panes;
            for (let pane of panes) {
                nodes.push({
                    level: level, type: 'pane',
                    name: Object.getPrototypeOf(pane).constructor.name,
                    id: pane.id,
                    leaf: true, pane: pane});
            }
        }
    }
    return nodes;
}

function getResourceIndexByPane(resources, pane) {
    let index = 0;
    while (index < resources.length && resources[index].pane !== pane) {
        index++;
    }
    return index === resources.length ? null : index
}

function ScreenTree({ tree, setSelected, resources, active, setActive }) {
    const editNode = node => {
        const index = getResourceIndexByPane(resources, node.pane);
        if (index === null) return d('NOT FOUND', node.pane, resources);
        setSelected(index);
    };

    return (
        <TreeStack editOp={editNode} active={active} setActive={setActive} tree={tree} />
    )
}

function ScreenEditor({ resources, setSelected, ...props }) {
    const [ active, setActive ] = useState(null)
    const planesRef = useRef([]);

    const tree = useMemo(() => {
        const screen = props.game.getCurrentScreen();
        const nodes = [];
        nodes.push({type: 'Screen', name: screen.id, level: 0, leaf: true, end: true});
        nodes.push( ...getAreaNodes(screen.areas) )

        // assign planes
        let plane = 0;
        for (let node of nodes) {
            node.plane = plane;
            if (node.type === 'pane') {
                const index = getResourceIndexByPane(resources, node.pane);
                planesRef.current.push(
                    index !== null ? resources[index].elem : {texture: null}
                ) ;
                plane++
            }
        }
        return nodes
    }, []);

    return (
        <Stack full border="1">
            <Section id="screenTree" name="Screen" full="v" collapse="h" inner  size={250} maxWidth="33%">
                <ScreenTree tree={tree} setSelected={setSelected} active={active} setActive={setActive} resources={resources} />
            </Section>

            <Section name="Planes" full inner>
                <Block full>
                    <Panes3D active={active === null ? null : tree[active].plane} elems={planesRef.current} />
                </Block>
            </Section>
        </Stack>
    )
}

export {
    ScreenEditor
}