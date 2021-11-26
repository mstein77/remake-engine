import React, {useContext, useEffect, useRef, useState} from "react";
import { d, hex2rgb, hex2rgbaArray } from "../helper/helper";
import { mat4, glMatrix } from "gl-matrix";
import { Block, Stack } from "./LayoutComponents";
import { AvailContext, AvailContextProvider, PropertyGrid } from "./BasicComponents";
import { NumberProp } from "./FormComponents";

class Object3D {

    constructor(uniforms = {}) {
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scaling = [1, 1, 1];
        this.jobs = [];
        this.enabled = true;
        this.uniforms = uniforms;
    }

    disable() {
        this.enabled = false
    }

    enable() {
        this.enabled = true
    }

    isDisabled() {
        return !this.enabled
    }

    getUniforms() {
        return this.uniforms;
    }

    getStore(storages, key) {
        if (!storages[key]) {
            storages[key] = [];
        }
        return storages[key]
    }

    getStaticStore() {
        return null
    }

    setRotation(rotation) {
        this.rotation = rotation
    }

    setScaling(scaling) {
        this.scaling = scaling
    }

    setPosition(position) {
        this.position = position
    }

    getPosition() {
        return this.position;
    }

    getPositionX() {
        return this.position[0];
    }

    setPositionY(value) {
        this.position[0] = value
    }

    getPositionY() {
        return this.position[1];
    }

    setPositionY(value) {
        this.position[1] = value
    }

    getPositionZ() {
        return this.position[2];
    }

    setPositionZ(value) {
        this.position[2] = value
    }

    translate( {x = 0, y = 0, z = 0} ) {
        this.position[0] += x;
        this.position[1] += y;
        this.position[2] += z;
    }

    getModelMatrix() {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix,     // destination matrix
            modelMatrix,     // matrix to translate
            this.position
        );  // amount to translate
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            glMatrix.toRadian(this.rotation[0]),     // amount to rotate in radians
            [-1, 0, 0]);       // axis to rotate around (Z)
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            glMatrix.toRadian(this.rotation[1]),// amount to rotate in radians
            [0, -1, 0]);       // axis to rotate around (X)
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            glMatrix.toRadian(this.rotation[2]),     // amount to rotate in radians
            [0, 0, -1]);       // axis to rotate around (Z)
        mat4.scale(modelMatrix, modelMatrix, this.scaling);

        return modelMatrix
    }

    getFlatArrayBuffer(type, bufferType, data) {
        const numComponents = data[0].length;
        return {
            type,
            numComponents,
            data: new bufferType([].concat(...data))
        }
    }

    getIndicesBuffer(data) {
        return {
            count: data.length,
            data: new Uint16Array(data)
        }
    }

    getColorBuffer(type, data) {
        const channels = [];
        for(let hex of data) {
            channels.push(hex2rgbaArray(hex))
        }
        return this.getFlatArrayBuffer(type, Float32Array, channels)
    }

    getTextures() {
        return [];
    }

    getProgramJobs(gl) {
        let store = this.getStaticStore();
        if (store === null) {
            store = this.jobs
        }
        if (store.length !== 0) {
            return store;
        }
        store.push( ...this.buildProgramJobs(gl) );


        return store;
    }

    buildProgramJobs(gl) {
        return [];
    }
}

class Scene {

    constructor() {
        this.vertexShader = {};
        this.fragmentShader = {};
        this.programs = {};
        this.objects = [];
        this.textures = {};
        this.rotation = [0, 0, 0];
        this.gl = null;
        this.animation = null;
        this.frames = 0;
        this.requestId = null;
        this.uniforms = {};

        this.fieldOfView = 25;
        this.zNear = -100.0;
        this.zFar = 100.0;
        this.ortho = false;

        this.viewRotation = [0, 0, 0];
        this.viewPosition = [0, 0, 0];
        this.viewScale = [1.0, 1.0, 1.0]
    }

    setFieldOfView(value) {
        this.fieldOfView = value
    }

    getFieldOfView() {
        return this.fieldOfView
    }

    setViewScale(scale) {
        this.viewScale = [scale, scale, scale]
    }

    getViewScale() {
        return this.viewScale
    }

    setViewRotation(rotation) {
        this.viewRotation = rotation
    }

    getViewRotation() {
        return this.viewRotation
    }

    setViewPosition(position) {
        this.viewPosition = position
    }

    getViewPosition() {
        return this.viewPosition
    }

    setZNear(value) {
        this.zNear = value
    }

    getZNear() {
        return this.zNear
    }

    setZFar(value) {
        this.zFar = value
    }

    getZFar() {
        return this.zFar
    }

    destroy() {
        if (this.requestId) {
            cancelAnimationFrame(this.requestId)
        }
    }

    setOrthognal() {
        this.ortho = true;
    }

    isReady() {
        return this.gl !== null
    }

    init(gl) {
        this.gl = gl;
        for (let object of this.objects) {
            this.registerTextures(object.getTextures());
        }
    }

    setUniform(key, value) {
        this.uniforms[key] = value
    }

    registerTextures(textures) {
        const gl = this.gl;
        for(let { id, data } of textures) {
            if (this.textures[id]) continue;

            const glTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, glTexture);

            const texture = {id, data: null, buffer: glTexture};

            const image = new Image();
            image.onload = () => {
                texture.data = image;
            }
            image.src = data;

            this.textures[id] = texture;
        }
    }

    animate(callback) {
        this.animation = callback
    }

    setRotation(vector) {
        this.rotation = vector
    }

    bindContext(gl) {
        this.gl = gl
    }

    addVertexShader({id, ...shader}) {
        this.vertexShader[id] = shader
    }

    addFragmentShader({id, ...shader}) {
        this.fragmentShader[id] = shader
    }

    getCompiledShader(type, shader) {
        if (shader.compiled) return;

        const gl = this.gl;
        const glShader = gl.createShader(type);
        gl.shaderSource(glShader, shader.source);
        gl.compileShader(glShader);

        // TODO: skip this in production
        if (!gl.getShaderParameter(glShader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(glShader);
            gl.deleteShader(glShader);
            throw Error(`An error occured compiling the ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ` + info);
        }
        shader.compiled = glShader;
        return shader
    }

    getShaderProgram(id) {
        if (!this.programs[id]) {
            const gl = this.gl;
            const [vsId, fsId] = id.split('|');
            const vertexShader = this.vertexShader[vsId];
            if (!vertexShader) {
                throw Error(`Vertex shader with id "${vsId}" not found!`)
            }
            const fragmentShader = this.fragmentShader[fsId];
            if (!fragmentShader) {
                throw Error(`Fragment shader with id "${fsId}" not found!`)
            }
            const program = {
                shaders: [
                    this.getCompiledShader(gl.VERTEX_SHADER, vertexShader),
                    this.getCompiledShader(gl.FRAGMENT_SHADER, fragmentShader)
                ]
            };
            this.programs[id] = program;
        }
        return this.programs[id]
    }

    linkPrograms(programIds) {
        const gl = this.gl;
        for (let id of programIds) {
            const program = this.getShaderProgram(id);
            if (program.linked) continue;

            const glProgram = gl.createProgram();
            const shaderAttribs = [];
            const shaderUniforms = [];
            for (let shader of program.shaders) {
                if (shader.attribs) {
                    for (let attrib of shader.attribs) {
                        const {name} = attrib;
                        if (shaderAttribs.includes(name)) continue;

                        shaderAttribs.push(name)
                    }
                }
                if (shader.uniforms) {
                    for (let name of shader.uniforms) {
                        if (shaderUniforms.includes(name)) continue;

                        shaderUniforms.push(name)
                    }
                }
                gl.attachShader(glProgram, shader.compiled);
            }
            gl.linkProgram(glProgram);
            if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
                // TODO: getShaderErrors here too
                throw Error(`Linking of shader program "${id}" failed: ` + gl.getProgramInfoLog(glProgram));
            }
            // TODO: skip this in production
            gl.validateProgram(glProgram);
            if (!gl.getProgramParameter(glProgram, gl.VALIDATE_STATUS)) {
                throw Error(`Validation of shader program "${id}" failed: ` + gl.getProgramInfoLog(glProgram))
            }
            program.linked = glProgram;

            // now lets get the location of the attributes and uniforms
            const attribs = [];
            for (let name of shaderAttribs) {
                const loc = gl.getAttribLocation(glProgram, name);
                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                attribs.push({
                    name,
                    loc,
                    buffer
                });
            }
            program.attribs = attribs;

            const uniforms = [];
            for (let {name, func} of shaderUniforms) {
                const loc = gl.getUniformLocation(glProgram, name);
                uniforms[name] = function (...values) {
                    if (func.startsWith('uniform1')) {
                        gl[func](loc, ...values);
                    } else {
                        gl[func](loc, false, ...values);
                    }
                }
            }
            program.uniforms = uniforms;

            const indices = gl.createBuffer(gl.ELEMENT_ARRAY_BUFFER);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
            program.indices = indices;
        }
    }

    addObject(object, position = [0, 0, 0], rotation = [0, 0, 0], scaling = [1, 1, 1]) {
        object.setPosition(position);
        object.setRotation(rotation);
        object.setScaling(scaling);
        this.objects.push(object);
        return object
    }

    getViewMatrix() {
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix, viewMatrix, this.viewPosition);
        mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.viewRotation[0]), [1, 0, 0]);
        mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.viewRotation[1]), [0, 1, 0]);
        mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.viewRotation[2]), [0, 0, 1]);
        mat4.invert(viewMatrix, viewMatrix);
        mat4.scale(viewMatrix, viewMatrix, this.viewScale)
        return viewMatrix
    }

    drawObject(model, job) {
        // get program
        const gl = this.gl;
        const { attribs, uniforms, indices } = this.getShaderProgram(job.program);

        uniforms.uViewMatrix(
            this.getViewMatrix()
        );
        uniforms.uModelMatrix(
            model.getModelMatrix()
        );
        const objUniforms = model.getUniforms();
        uniforms.uMirror(0);
        const uniformValues = { ...this.uniforms, ...objUniforms };
        for(let [uniform, value] of Object.entries(uniformValues)) {
            const setter = uniforms[uniform];
            if (setter) {
                setter(value);
            }
        }

        for (let {name, loc, buffer} of attribs) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            const {data, type, numComponents, normalize = false} = job.attribs[name];
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.vertexAttribPointer(loc, numComponents, type, normalize, 0, 0);
            gl.enableVertexAttribArray(loc)
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, job.indices.data, gl.STATIC_DRAW);

        if (job.textures) {
            for (let i = 0; i < job.textures.length; i++) {
                const texParams = job.textures[i];
                const texture = this.textures[texParams.id];
                if (!texture) throw Error(`Could not find texture with id "${texParams.id}"`)

                gl.bindTexture(gl.TEXTURE_2D, texture.buffer);
                if (texture.data === null) {
                    gl.texImage2D(gl.TEXTURE_2D, i, gl.RGBA,
                        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                        new Uint8Array([200, 0, 255, 155])
                    );
                } else {
                    gl.texImage2D(gl.TEXTURE_2D, i, gl.RGBA,
                        gl.RGBA, gl.UNSIGNED_BYTE, texture.data
                    );
                    if (texParams.wrap) {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texParams.wrap);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texParams.wrap);
                    }
                    if (texParams.min_filter) {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texParams.min_filter);
                    }
                }
            }
        }
        gl.drawElements(job.type, job.indices.count, gl.UNSIGNED_SHORT, 0);
    }

    draw(gl) {
        const programJobs = {};
        const jobQueue = [];
        for (let object of this.objects) {
            const jobs = object.getProgramJobs(gl);

            for (let job of jobs) {
                const program = job.program;
                this.getShaderProgram(program);
                if (!programJobs[program]) {
                    programJobs[program] = []
                }
                jobQueue.push({model: object, job, program})
            }
        }
        this.linkPrograms(Object.keys(programJobs));


        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Clear the canvas before we start drawing on it.

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Create a perspective matrix, a special matrix that is
        // used to simulate the distortion of perspective in a camera.
        // Our field of view is 45 degrees, with a width/height
        // ratio that matches the display size of the canvas
        // and we only want to see objects between 0.1 units
        // and 100 units away from the camera.

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const fieldOfView = this.fieldOfView * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = this.zNear;
        const zFar = this.zFar;
        const projectionMatrix = mat4.create();

        if (this.ortho) {
            mat4.ortho(projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
        } else {
            mat4.perspective(projectionMatrix,
                fieldOfView,
                aspect,
                zNear,
                zFar
            );
        }

        for (let { program, job, model } of jobQueue) {
            if (model.isDisabled()) continue;

            const shaderProgram = this.getShaderProgram(program);
            gl.useProgram(shaderProgram.linked);
            shaderProgram.uniforms.uProjectionMatrix(
                projectionMatrix
            );
            this.drawObject(model, job);
        }

        if (this.animation) {
            this.requestId = requestAnimationFrame(() => this.waitForNextFrame());
        }
    }

    waitForNextFrame() {
        this.requestId = null;
        this.frames++;
        if (this.animation(this.gl, this.frames)) {
            this.draw(this.gl)
        } else {
            this.requestId = requestAnimationFrame(() => this.waitForNextFrame())
        }
    }
}

function Scene3DCanvas({ width, height, scene }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const gl = canvasRef.current.getContext('webgl', {premultipliedAlpha: false});

        if (!gl) {
            d('COULD NOT GET GL CONTEXT!');
            return;
        }
        if (!scene.isReady()) {
            scene.init(gl);
        }
        scene.draw(gl);
        return () => {
            scene.destroy()
        }
    }, []);

    return (
        <canvas ref={canvasRef} width={width} height={height} />
    )
}

function FlexCanvas3DInner(props) {
    const aContext = useContext(AvailContext);
    if (!aContext.width || !aContext.height) return '';
    return (
        <Canvas3D width={aContext.width} height={aContext.height} { ...props } />
    )
}

function FlexCanvas3D(props) {
    return (
        <AvailContextProvider>
            <FlexCanvas3DInner { ...props } />
        </AvailContextProvider>
    )
}

function FlexScene3D({ elems }) {
    const [ xRotation, setXRotation ] = useState(0.0);
    const [ yRotation, setYRotation ] = useState(0.5);
    const [ zRotation, setZRotation ] = useState(0.0);
    const [ xDist, setXDist ] = useState(-2.0);
    const [ yDist, setYDist ] = useState(-0.0);
    const [ zDist, setZDist ] = useState(-3.0);

    const sceneProps = {
        xRotation, setXRotation, yRotation, setYRotation, zRotation, setZRotation,
        xDist, setXDist, yDist, setYDist, zDist, setZDist, elems
    };
    return (
        <Stack vertical full borders>
            <Block full>
                <FlexCanvas3D { ...sceneProps } />
            </Block>
            <Block full="h">
                <Stack center="h">
                    <PropertyGrid>
                        <NumberProp min={-1.0} max={1.0} decimals={2} slider="h" name="xRotation" value={xRotation} set={setXRotation} />
                        <NumberProp min={-1.0} max={1.0} decimals={2} slider="h" name="yRotation" value={yRotation} set={setYRotation} />
                        <NumberProp min={-1.0} max={1.0} decimals={2} slider="h" name="zRotation" value={zRotation} set={setZRotation} />
                    </PropertyGrid>
                    <PropertyGrid>
                        <NumberProp min={-30.0} max={10.0} decimals={2} slider="h" name="xDist" value={xDist} set={setXDist} />
                        <NumberProp min={-30.0} max={10.0} decimals={2} slider="h" name="yDist" value={yDist} set={setYDist} />
                        <NumberProp min={-30.0} max={10.0} decimals={2} slider="h" name="zDist" value={zDist} set={setZDist} />
                    </PropertyGrid>
                </Stack>
            </Block>
        </Stack>
    )
}

export {
    Scene,
    Scene3DCanvas,
    FlexScene3D,
    Object3D
}