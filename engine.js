// ============================================================
//  Minimal matrix math (column-major, Float32Array)
// ============================================================

function cross_product(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v) {
    let len = Math.hypot(v[0], v[1], v[2]);
    if (len) { len = 1 / len; v[0] *= len; v[1] *= len; v[2] *= len; }
    return v;
}

function mat4Create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
}

function mat4Multiply(out, a, b) {
    for (let i = 0; i < 4; i++) {
        const a0 = a[i], a4 = a[i + 4], a8 = a[i + 8], a12 = a[i + 12];
        out[i]      = a0 * b[0]  + a4 * b[1]  + a8 * b[2]  + a12 * b[3];
        out[i + 4]  = a0 * b[4]  + a4 * b[5]  + a8 * b[6]  + a12 * b[7];
        out[i + 8]  = a0 * b[8]  + a4 * b[9]  + a8 * b[10] + a12 * b[11];
        out[i + 12] = a0 * b[12] + a4 * b[13] + a8 * b[14] + a12 * b[15];
    }
    return out;
}

// Returns the perspective projection matrix
function mat4Perspective(out, fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0]  = f / aspect;
    out[5]  = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
}

// Returns the view matrix.
// eye: position of the camera
// center: position of the center of the scene
// up: up direction of the camera
function mat4LookAt(out, eye, center, up) {
    let x, y, z;

    z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
    x = normalize(cross_product(up, z));
    y = normalize(cross_product(z, x));

    out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
    out[12] = -dot(x, eye);
    out[13] = -dot(y, eye);
    out[14] = -dot(z, eye);
    out[15] = 1;
    return out;
}

function mat4RotateX(out, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const t = mat4Create();
    t[5] = c; t[6] = s; t[9] = -s; t[10] = c;
    return mat4Multiply(out, a, t);
}

function mat4RotateY(out, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const t = mat4Create();
    t[0] = c; t[2] = -s; t[8] = s; t[10] = c;
    return mat4Multiply(out, a, t);
}

function mat4InverseTranspose(out, m) {
    // Extract the 3×3 upper-left of column-major matrix m.
    // m[col*4 + row], so mRC = m at row R, column C.
    const m00 = m[0], m10 = m[1], m20 = m[2];   // column 0
    const m01 = m[4], m11 = m[5], m21 = m[6];   // column 1
    const m02 = m[8], m12 = m[9], m22 = m[10];  // column 2

    const det = m00 * (m11 * m22 - m12 * m21)
              - m01 * (m10 * m22 - m12 * m20)
              + m02 * (m10 * m21 - m11 * m20);
    const id = 1.0 / det;

    // The inverse-transpose = cofactor matrix / determinant.
    // Store in column-major: out[col*4 + row] = Cofactor[row][col] / det
    out.fill(0);
    out[0]  =  (m11 * m22 - m12 * m21) * id;
    out[1]  = -(m01 * m22 - m02 * m21) * id;
    out[2]  =  (m01 * m12 - m02 * m11) * id;
    out[4]  = -(m10 * m22 - m12 * m20) * id;
    out[5]  =  (m00 * m22 - m02 * m20) * id;
    out[6]  = -(m00 * m12 - m02 * m10) * id;
    out[8]  =  (m10 * m21 - m11 * m20) * id;
    out[9]  = -(m00 * m21 - m01 * m20) * id;
    out[10] =  (m00 * m11 - m01 * m10) * id;
    out[15] = 1;
    return out;
}


// ============================================================
//  Box geometry
// ============================================================

function createBox() {
    // 6 faces, each with 4 unique vertices (for flat normals), 2 triangles
    const faceData = [
        // positions (4 verts)           normal           color
        { verts: [[-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]], n: [ 0, 0, 1], color: [0.30, 0.60, 1.00] },  // front  – blue
        { verts: [[ 1,-1,-1],[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1]], n: [ 0, 0,-1], color: [0.20, 0.80, 0.50] },  // back   – green
        { verts: [[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1],[-1, 1,-1]], n: [ 0, 1, 0], color: [1.00, 0.35, 0.40] },  // top    – red
        { verts: [[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1]], n: [ 0,-1, 0], color: [1.00, 0.75, 0.20] },  // bottom – gold
        { verts: [[ 1,-1, 1],[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1]], n: [ 1, 0, 0], color: [0.85, 0.30, 0.90] },  // right  – purple
        { verts: [[-1,-1,-1],[-1,-1, 1],[-1, 1, 1],[-1, 1,-1]], n: [-1, 0, 0], color: [0.10, 0.85, 0.85] },  // left   – cyan
    ];

    const positions = [];
    const normals   = [];
    const colors    = [];
    const indices   = [];

    faceData.forEach((face, i) => {
        const base = i * 4;
        face.verts.forEach(v => {
            positions.push(...v);
            normals.push(...face.n);
            colors.push(...face.color);
        });

        // Lines
        indices.push(base, base + 1, base + 1, base + 2, base + 2, base + 3, base + 3, base);
    });

    return {
        positions: new Float32Array(positions),
        normals:   new Float32Array(normals),
        colors:    new Float32Array(colors),
        indices:   new Uint16Array(indices),
        count:     indices.length,
    };
}


// ============================================================
//  Shader helpers
// ============================================================

function compileShader(gl, id, type) {
    const src = document.getElementById(id).textContent;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error (" + id + "):", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vsId, fsId) {
    const vs = compileShader(gl, vsId, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fsId, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}


// ============================================================
//  Buffer helpers
// ============================================================

function createBuffer(gl, target, data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(target, buf);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buf;
}

function setAttribute(gl, buffer, location, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}


// ============================================================
//  Main
// ============================================================

// ============================================================
//  UBO helpers (WebGL 2)
// ============================================================

const MAX_POINTS = 64;
// std140 layout: 16 bytes for int (padded), then 64 * 16 bytes for vec4 array
const UBO_SIZE = 16 + MAX_POINTS * 16;
const VORONOI_BINDING_POINT = 0;

function createVoronoiUBO(gl) {
    const ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, UBO_SIZE, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Bind the buffer to binding point 0
    gl.bindBufferBase(gl.UNIFORM_BUFFER, VORONOI_BINDING_POINT, ubo);
    return ubo;
}

function bindVoronoiUBOToProgram(gl, program) {
    const blockIndex = gl.getUniformBlockIndex(program, "VoronoiPoints");
    if (blockIndex !== gl.INVALID_INDEX) {
        gl.uniformBlockBinding(program, blockIndex, VORONOI_BINDING_POINT);
    }
}

// Upload an array of [x,y,z] points to the UBO
function updateVoronoiPoints(gl, ubo, points) {
    const count = Math.min(points.length, MAX_POINTS);

    // Build the std140-aligned buffer:
    // Bytes 0-3:   int numPoints
    // Bytes 4-15:  padding
    // Bytes 16+:   vec4[MAX_POINTS] (each 16 bytes, w unused)
    const buffer = new ArrayBuffer(UBO_SIZE);
    const intView = new Int32Array(buffer, 0, 1);
    const floatView = new Float32Array(buffer);

    intView[0] = count;

    for (let i = 0; i < count; i++) {
        const offset = 4 + i * 4;  // float index: skip 4 floats (16 bytes) for the int, then 4 per vec4
        floatView[offset]     = points[i][0];
        floatView[offset + 1] = points[i][1];
        floatView[offset + 2] = points[i][2];
        floatView[offset + 3] = 0.0;  // w padding
    }

    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(buffer));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}


// ============================================================
//  Main
// ============================================================

(function main() {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2 not supported");
        return;
    }

    // ---- Shader programs ----
    const box_program = createProgram(gl, "vshader-box", "fshader-box");
    const voronoi_program = createProgram(gl, "vshader-voronoi", "fshader-voronoi");

    // ---- Voronoi UBO setup ----
    const voronoiUBO = createVoronoiUBO(gl);
    bindVoronoiUBOToProgram(gl, voronoi_program);

    // Upload some initial test points inside the [-1, 1] cube
    const testPoints = [
        [ 0.5,  0.3,  0.2],
        [-0.4,  0.7, -0.3],
        [ 0.1, -0.6,  0.8],
        [-0.8,  0.2,  0.5],
        [ 0.3, -0.4, -0.7],
        [-0.2, -0.8,  0.1],
        [ 0.7,  0.5, -0.4],
        [-0.6,  0.1,  0.9],
    ];
    updateVoronoiPoints(gl, voronoiUBO, testPoints);


    // ---- Box VAO ----
    const box_vao = gl.createVertexArray();
    gl.useProgram(box_program);
    gl.bindVertexArray(box_vao);
    // ---- Attribute locations ----
    const aPosition = gl.getAttribLocation(box_program, "aPosition");
    const aNormal   = gl.getAttribLocation(box_program, "aNormal");
    const aColor    = gl.getAttribLocation(box_program, "aColor");

    // ---- Uniform locations ----
    const uMVP       = gl.getUniformLocation(box_program, "uModelViewProjection");
    const uNormal    = gl.getUniformLocation(box_program, "uNormalMatrix");
    const uLightDir  = gl.getUniformLocation(box_program, "uLightDir");

    // ---- Geometry ----
    const box = createBox();
    const posBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.positions);
    const nrmBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.normals);
    const colBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.colors);
    const idxBuf = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, box.indices);

    setAttribute(gl, posBuf, aPosition, 3);
    setAttribute(gl, nrmBuf, aNormal, 3);
    setAttribute(gl, colBuf, aColor, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

    // ---- Light ----
    gl.uniform3f(uLightDir, 0, 0.7, 1.0);

    gl.bindVertexArray(null);

    // ---- Voronoi VAO ----
    const voronoi_vao = gl.createVertexArray();
    gl.useProgram(voronoi_program);
    gl.bindVertexArray(voronoi_vao);

    const aPosition_voronoi = gl.getAttribLocation(voronoi_program, "aPosition");
    const uMVP_voronoi = gl.getUniformLocation(voronoi_program, "uModelViewProjection");

    const voronoi_buf = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(testPoints.flat()));
    setAttribute(gl, voronoi_buf, aPosition_voronoi, 3);

    gl.bindVertexArray(null);

    // ---- GL state ----
    gl.clearColor(0.04, 0.04, 0.06, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // ---- Matrices ----
    const proj  = mat4Create();
    const view  = mat4Create();
    const mv    = mat4Create();
    const mvp   = mat4Create();
    const norm  = mat4Create();

    // ---- Render loop ----
    const input = window.inputState || { deltaX: 0, deltaY: 0, velocityX: 0, velocityY: 0, zoom: 7, interacting: false };

    // Persistent model rotation matrix — accumulated over time
    const modelRotation = mat4Create();
    const temp = mat4Create();   // scratch matrix for pre-multiplication

    // Apply an initial tilt so we see three faces
    mat4RotateX(modelRotation, modelRotation, 0.35);

    function frame() {
        let dx = 0, dy = 0;

        if (input.interacting) {
            // Consume the deltas that input.js accumulated this frame
            dx = input.deltaX;
            dy = input.deltaY;
            input.deltaX = 0;
            input.deltaY = 0;
        } else {
            // Apply momentum from last pan velocity
            dx = input.velocityX;
            dy = input.velocityY;
            input.velocityX *= 0.95;
            input.velocityY *= 0.95;
            if (Math.abs(input.velocityX) < 0.0001) input.velocityX = 0;
            if (Math.abs(input.velocityY) < 0.0001) input.velocityY = 0;
        }

        // Apply incremental rotation in VIEW space (pre-multiply)
        // This ensures dragging always rotates relative to the screen,
        // regardless of the cube's current orientation.
        if (dx !== 0 || dy !== 0) {
            const inc = mat4Create();
            mat4RotateY(inc, inc, dx);   // horizontal drag → rotate around screen Y
            mat4RotateX(inc, inc, dy);   // vertical drag   → rotate around screen X
            // Pre-multiply: inc * modelRotation → temp, then copy back
            mat4Multiply(temp, inc, modelRotation);
            modelRotation.set(temp);
        }

        // Update view matrix with current zoom
        mat4LookAt(view, [0, 0, input.zoom], [0, 0, 0], [0, 1, 0]);

        // Resize canvas to match display size (handles high-DPI)
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth  * dpr | 0;
        const h = canvas.clientHeight * dpr | 0;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Projection
        const aspect = canvas.width / canvas.height;
        mat4Perspective(proj, Math.PI / 6, aspect, 0.1, 100);

        // MVP
        mat4Multiply(mv, view, modelRotation);
        mat4Multiply(mvp, proj, mv);

        // Normal matrix (inverse-transpose of model-view)
        mat4InverseTranspose(norm, mv);

        // Draw
        gl.bindVertexArray(box_vao);
        gl.useProgram(box_program)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(uMVP, false, mvp);
        gl.uniformMatrix4fv(uNormal, false, norm);
        gl.drawElements(gl.LINES, box.count, gl.UNSIGNED_SHORT, 0);

        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(voronoi_vao);
        gl.useProgram(voronoi_program);
        gl.uniformMatrix4fv(uMVP_voronoi, false, mvp);
        gl.drawArrays(gl.POINTS, 0, testPoints.length);
        gl.bindVertexArray(null);
        gl.enable(gl.CULL_FACE);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();