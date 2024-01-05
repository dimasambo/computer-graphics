'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
const { sin, cos, pow, PI } = Math
let sphere;
let texCoord = [0, 0]

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals, textures) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

function changed() {
    surface.BufferData(...CreateSurfaceData());
    draw()
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    const normalMatrix = m4.identity();
    m4.inverse(modelView, normalMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [...hexToRgb(document.getElementById('c').value), 1]);
    gl.uniform3fv(shProgram.iLightPos, [1 * cos(Date.now() * 0.001), 2 * sin(Date.now() * 0.001), 0]);
    gl.uniform2fv(shProgram.iTT, texCoord);
    gl.uniform1f(shProgram.iScale, document.getElementById('s').value);

    surface.Draw();
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(
        modelViewProjection,
        m4.translation(...cyl2(texCoord[0] * 2 * b, texCoord[1] * 2 * PI))
    ));
    gl.uniform4fv(shProgram.iColor, [1, 1, 1, 100]);
    sphere.Draw();
}
function animation() {
    draw()
    window.requestAnimationFrame(animation)
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255]
}
let r2 = 1,
    r1 = r2 * 0.5,
    b = 1;
function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let textureList = [];
    const NUM_STEPS_I = parseInt(document.getElementById('numStepsI').value);
    const NUM_STEPS_J = 50;
    r2 = document.getElementById('r2').value
    // r1 = document.getElementById('r1').value
    b = document.getElementById('b').value
    const ist = 2 * b / NUM_STEPS_I;
    const jst = 2 * PI / NUM_STEPS_J;
    for (let i = 0; i < 2 * b; i += ist) {
        for (let j = 0; j < 2 * PI; j += jst) {
            vertexList.push(
                ...cyl2(i, j),
                ...cyl2(i + ist, j),
                ...cyl2(i, j + jst),
                ...cyl2(i, j + jst),
                ...cyl2(i + ist, j),
                ...cyl2(i + ist, j + jst),
            );
            normalList.push(
                ...normalAnalytical(i, j),
                ...normalAnalytical(i + ist, j),
                ...normalAnalytical(i, j + jst),
                ...normalAnalytical(i, j + jst),
                ...normalAnalytical(i + ist, j),
                ...normalAnalytical(i + ist, j + jst),
            )
            textureList.push(
                i / (2 * b), j / (2 * PI),
                (i + ist) / (2 * b), j / (2 * PI),
                i / (2 * b), (j + jst) / (2 * PI),
                i / (2 * b), (j + jst) / (2 * PI),
                (i + ist) / (2 * b), j / (2 * PI),
                (i + ist) / (2 * b), (j + jst) / (2 * PI),
            )
        }
    }

    return [vertexList, normalList, textureList];
}

function CreateSphereData() {
    let vertexList = [];

    let u = 0,
        t = 0;
    while (u < Math.PI * 2) {
        while (t < Math.PI) {
            let v = getSphereVertex(u, t);
            let w = getSphereVertex(u + 0.1, t);
            let wv = getSphereVertex(u, t + 0.1);
            let ww = getSphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            vertexList.push(w.x, w.y, w.z);
            vertexList.push(wv.x, wv.y, wv.z);
            vertexList.push(wv.x, wv.y, wv.z);
            vertexList.push(w.x, w.y, w.z);
            vertexList.push(ww.x, ww.y, ww.z);
            t += 0.1;
        }
        t = 0;
        u += 0.1;
    }
    return [vertexList, vertexList, vertexList];
}
const radius = 0.05;
function getSphereVertex(long, lat) {
    return {
        x: radius * Math.cos(long) * Math.sin(lat),
        y: radius * Math.sin(long) * Math.sin(lat),
        z: radius * Math.cos(lat)
    }
}

const eps = 0.0001
function normalAnalytical(ii, jj) {
    let u1 = cyl2(ii, jj),
        u2 = cyl2(ii + eps, jj),
        v1 = cyl2(ii, jj),
        v2 = cyl2(ii, jj + eps);
    const dU = [], dV = []
    for (let i = 0; i < 3; i++) {
        dU.push((u1[i] - u2[i]) / eps)
        dV.push((v1[i] - v2[i]) / eps)
    }
    const n = m4.normalize(m4.cross(dU, dV))
    return n
}

function cyl2(a, b) {
    let x = r(a) * cos(b);
    let y = r(a) * sin(b);
    let z = a;
    return [x, y, z];
}


function r(a) {
    let rr = (r2 - r1) * pow(sin(PI * a / (4 * b)), 2) + r1
    return rr;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLightPos = gl.getUniformLocation(prog, "lightPos");
    shProgram.iTT = gl.getUniformLocation(prog, "tt");
    shProgram.iScale = gl.getUniformLocation(prog, "s");

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());
    sphere = new Model()
    sphere.BufferData(...CreateSphereData())

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    LoadTexture()
    animation();
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/dimasambo/computer-graphics/CGW/pic-pink.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}

window.onkeydown = (e) => {
    if (e.keyCode == 87) {
        texCoord[0] = Math.min(texCoord[0] + 0.01, 1);
    }
    else if (e.keyCode == 83) {
        texCoord[0] = Math.max(texCoord[0] - 0.01, 0);
    }
    else if (e.keyCode == 68) {
        texCoord[1] = Math.min(texCoord[1] + 0.01, 1);
    }
    else if (e.keyCode == 65) {
        texCoord[1] = Math.max(texCoord[1] - 0.01, 0);
    }
}