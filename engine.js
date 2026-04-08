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
        out[i] = a0 * b[0] + a4 * b[1] + a8 * b[2] + a12 * b[3];
        out[i + 4] = a0 * b[4] + a4 * b[5] + a8 * b[6] + a12 * b[7];
        out[i + 8] = a0 * b[8] + a4 * b[9] + a8 * b[10] + a12 * b[11];
        out[i + 12] = a0 * b[12] + a4 * b[13] + a8 * b[14] + a12 * b[15];
    }
    return out;
}

// Returns the perspective projection matrix
function mat4Perspective(out, fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
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
    out[0] = (m11 * m22 - m12 * m21) * id;
    out[1] = -(m01 * m22 - m02 * m21) * id;
    out[2] = (m01 * m12 - m02 * m11) * id;
    out[4] = -(m10 * m22 - m12 * m20) * id;
    out[5] = (m00 * m22 - m02 * m20) * id;
    out[6] = -(m00 * m12 - m02 * m10) * id;
    out[8] = (m10 * m21 - m11 * m20) * id;
    out[9] = -(m00 * m21 - m01 * m20) * id;
    out[10] = (m00 * m11 - m01 * m10) * id;
    out[15] = 1;
    return out;
}

function mat4Transpose(out, m) {
    out[0] = m[0]; out[1] = m[4]; out[2] = m[8]; out[3] = m[12];
    out[4] = m[1]; out[5] = m[5]; out[6] = m[9]; out[7] = m[13];
    out[8] = m[2]; out[9] = m[6]; out[10] = m[10]; out[11] = m[14];
    out[12] = m[3]; out[13] = m[7]; out[14] = m[11]; out[15] = m[15];
    return out;
}


// ============================================================
//  Box geometry
// ============================================================

function createBox() {
    // 6 faces, each with 4 unique vertices (for flat normals), 2 triangles
    const faceData = [
        // positions (4 verts)           normal           color
        { verts: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], n: [0, 0, 1], color: [0.30, 0.60, 1.00] },  // front  – blue
        { verts: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], n: [0, 0, -1], color: [0.20, 0.80, 0.50] },  // back   – green
        { verts: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], n: [0, 1, 0], color: [1.00, 0.35, 0.40] },  // top    – red
        { verts: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], n: [0, -1, 0], color: [1.00, 0.75, 0.20] },  // bottom – gold
        { verts: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], n: [1, 0, 0], color: [0.85, 0.30, 0.90] },  // right  – purple
        { verts: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], n: [-1, 0, 0], color: [0.10, 0.85, 0.85] },  // left   – cyan
    ];

    const positions = [];
    const normals = [];
    const colors = [];
    const line_indices = [];
    const triangle_indices = [];

    faceData.forEach((face, i) => {
        const base = i * 4;
        face.verts.forEach(v => {
            positions.push(...v);
            normals.push(...face.n);
            colors.push(...face.color);
        });

        // Lines
        line_indices.push(base, base + 1, base + 1, base + 2, base + 2, base + 3, base + 3, base);
        triangle_indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        colors: new Float32Array(colors),
        line_indices: new Uint16Array(line_indices),
        triangle_indices: new Uint16Array(triangle_indices),
        line_count: line_indices.length,
        triangle_count: triangle_indices.length,
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
//  UBO helpers (WebGL 2)
// ============================================================

const MAX_POINTS = 64;
// std140 layout: int(16) + vec4 points[64](1024) + vec4 colors[64](1024)
const UBO_SIZE = 16 + MAX_POINTS * 16 * 2;
const VORONOI_BINDING_POINT = 0;

function hexToRGB(hex) {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
    ];
}

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

// Upload seed positions and colors to the UBO
function updateVoronoiPoints(gl, ubo, seeds) {
    const count = Math.min(seeds.length, MAX_POINTS);

    // std140 layout:
    //   Bytes 0-3:    int numPoints
    //   Bytes 4-15:   padding
    //   Bytes 16+:    vec4 uPoints[64]  (positions)
    //   Bytes 1040+:  vec4 uColors[64]  (colors)
    const buffer = new ArrayBuffer(UBO_SIZE);
    const dataView = new DataView(buffer);
    dataView.setInt32(0, count, true);

    const colorsStart = 16 + MAX_POINTS * 16;

    for (let i = 0; i < count; i++) {
        // Position
        const pOff = 16 + i * 16;
        dataView.setFloat32(pOff,     seeds[i].pos[0], true);
        dataView.setFloat32(pOff + 4, seeds[i].pos[1], true);
        dataView.setFloat32(pOff + 8, seeds[i].pos[2], true);
        dataView.setFloat32(pOff + 12, 0.0, true);

        // Color
        const cOff = colorsStart + i * 16;
        const rgb = hexToRGB(seeds[i].color);
        dataView.setFloat32(cOff,     rgb[0], true);
        dataView.setFloat32(cOff + 4, rgb[1], true);
        dataView.setFloat32(cOff + 8, rgb[2], true);
        dataView.setFloat32(cOff + 12, 1.0, true);
    }

    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, new Float32Array(buffer));
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}


// ============================================================
//  3D Texture baking
// ============================================================

function bakeTexture(gl, program, vao, framebuffer, texture, textureSize, uSliceZ) {
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, textureSize, textureSize);
    gl.disable(gl.DEPTH_TEST);

    for (let z = 0; z < textureSize; z++) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture, 0, z);
        const zNorm = -1.0 + (2.0 * (z + 0.5)) / textureSize;
        gl.uniform1f(uSliceZ, zNorm);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Restore screen render state
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function updateSeedMask(gl, low_uniform, high_uniform, enables) {
    let maskLow = 0;
    for (let i = 0; i < 32; i++) {
        if (enables[i]) maskLow |= (1 << i);
    }

    let maskHigh = 0;
    for (let i = 0; i < 32; i++) {
        if (enables[i + 32]) maskHigh |= (1 << i);
    }

    gl.uniform1ui(low_uniform, maskLow >>> 0);
    gl.uniform1ui(high_uniform, maskHigh >>> 0);
}

function updateSeedUI(ctx) {
    const {
        gl, raymarchProgram, seeds, enables,
        uSeedMaskLow, uSeedMaskHigh, voronoiUBO,
        bakerProgram, bakerVao, bakeFBO,
        voronoiTexture, texture_size, uSliceZ,
    } = ctx;

    // Update header count
    const countEl = document.getElementById('seed-count');
    if (countEl) {
        countEl.textContent = `${seeds.length} seed${seeds.length !== 1 ? 's' : ''}`;
    }

    const seedList = document.getElementById("seed-list");
    seedList.innerHTML = "";

    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        const card = document.createElement('div');
        card.className = 'seed-card';

        // Header row: toggle, color swatch, label, delete
        const header = document.createElement('div');
        header.className = 'seed-card-header';

        // Toggle switch
        const toggle = document.createElement('label');
        toggle.className = 'toggle-switch';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = enables[i];
        cb.onchange = (e) => {
            enables[i] = e.target.checked;
            gl.useProgram(raymarchProgram);
            updateSeedMask(gl, uSeedMaskLow, uSeedMaskHigh, enables);
        };
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        toggle.appendChild(cb);
        toggle.appendChild(slider);

        // Color swatch
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = seed.color;
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = seed.color;
        colorInput.oninput = (e) => {
            seed.color = e.target.value;
            swatch.style.background = e.target.value;
            updateVoronoiPoints(gl, voronoiUBO, seeds);
        };
        swatch.appendChild(colorInput);

        // Label
        const label = document.createElement('span');
        label.className = 'seed-card-label';
        label.textContent = `Seed ${i}`;

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&#10005;';
        deleteBtn.onclick = () => {
            seeds.splice(i, 1);
            enables.splice(i, 1);
            enables.push(true);
            updateVoronoiPoints(gl, voronoiUBO, seeds);
            gl.useProgram(raymarchProgram);
            updateSeedMask(gl, uSeedMaskLow, uSeedMaskHigh, enables);
            bakeTexture(gl, bakerProgram, bakerVao, bakeFBO,
                voronoiTexture, texture_size, uSliceZ);
            updateSeedUI(ctx);
        };

        header.appendChild(toggle);
        header.appendChild(swatch);
        header.appendChild(label);
        header.appendChild(deleteBtn);

        // Coordinates row
        const coords = document.createElement('div');
        coords.className = 'seed-card-coords';
        const p = seed.pos;
        coords.textContent = `(${p[0].toFixed(2)}, ${p[1].toFixed(2)}, ${p[2].toFixed(2)})`;

        card.appendChild(header);
        card.appendChild(coords);
        seedList.appendChild(card);
    }
}

function setupAddSeedForm(ctx) {
    const {
        gl, raymarchProgram, seeds, enables,
        uSeedMaskLow, uSeedMaskHigh, voronoiUBO,
        bakerProgram, bakerVao, bakeFBO,
        voronoiTexture, texture_size, uSliceZ,
    } = ctx;

    const section = document.getElementById('add-seed-section');

    // Title
    const title = document.createElement('div');
    title.className = 'add-seed-title';
    title.textContent = 'New Seed';
    section.appendChild(title);

    // Coordinate inputs
    const inputsGrid = document.createElement('div');
    inputsGrid.className = 'add-seed-inputs';

    const inputs = {};
    ['X', 'Y', 'Z'].forEach(axis => {
        const group = document.createElement('div');
        group.className = 'coord-input-group';
        const lbl = document.createElement('label');
        lbl.textContent = axis;
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.step = '0.1';
        inp.min = '-1';
        inp.max = '1';
        inp.value = '0';
        group.appendChild(lbl);
        group.appendChild(inp);
        inputsGrid.appendChild(group);
        inputs[axis] = inp;
    });
    section.appendChild(inputsGrid);

    // Color picker + add button row
    const row = document.createElement('div');
    row.className = 'add-seed-row';

    const colorDiv = document.createElement('div');
    colorDiv.className = 'add-seed-color';
    colorDiv.style.background = '#ffffff';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#ffffff';
    colorInput.oninput = (e) => {
        colorDiv.style.background = e.target.value;
    };
    colorDiv.appendChild(colorInput);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Add Seed';
    addBtn.onclick = () => {
        const x = Math.max(-1, Math.min(1, parseFloat(inputs.X.value) || 0));
        const y = Math.max(-1, Math.min(1, parseFloat(inputs.Y.value) || 0));
        const z = Math.max(-1, Math.min(1, parseFloat(inputs.Z.value) || 0));
        seeds.push({ pos: [x, y, z], color: colorInput.value });
        updateVoronoiPoints(gl, voronoiUBO, seeds);
        gl.useProgram(raymarchProgram);
        updateSeedMask(gl, uSeedMaskLow, uSeedMaskHigh, enables);
        bakeTexture(gl, bakerProgram, bakerVao, bakeFBO,
            voronoiTexture, texture_size, uSliceZ);
        updateSeedUI(ctx);
    };

    row.appendChild(colorDiv);
    row.appendChild(addBtn);
    section.appendChild(row);
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

    const input = window.inputState || { deltaX: 0, deltaY: 0, velocityX: 0, velocityY: 0, zoom: 7, interacting: false };
    let cam_pos = [0, 0, input.zoom];
    const texture_size = 300;

    // ---- Seeds ----
    const seeds = [
        { pos: [0.5, 0.3, 0.2],   color: '#4A90D9' },
        { pos: [-0.4, 0.7, -0.3], color: '#E74C3C' },
        { pos: [0.1, -0.6, 0.8],  color: '#2ECC71' },
        { pos: [-0.8, 0.2, 0.5],  color: '#F39C12' },
        { pos: [0.3, -0.4, -0.7], color: '#9B59B6' },
        { pos: [-0.2, -0.8, 0.1], color: '#1ABC9C' },
        { pos: [0.7, 0.5, -0.4],  color: '#E91E63' },
        { pos: [-0.6, 0.1, 0.9],  color: '#FF9800' },
        { pos: [0, 0, 0],         color: '#00BCD4' },
    ];
    const enables = Array(64).fill(true);

    // ---- Shader programs ----
    const boxProgram = createProgram(gl, "vshader-box", "fshader-box");
    const bakerProgram = createProgram(gl, "texture-baker-vertex", "texture-baker-fragment");
    const raymarchProgram = createProgram(gl, "raymarch-vertex", "raymarch-fragment");

    // ---- UBO setup ----
    const voronoiUBO = createVoronoiUBO(gl);
    bindVoronoiUBOToProgram(gl, bakerProgram);
    bindVoronoiUBOToProgram(gl, raymarchProgram);
    updateVoronoiPoints(gl, voronoiUBO, seeds);

    // ---- Box VAO ----
    const boxVao = gl.createVertexArray();
    gl.bindVertexArray(boxVao);
    gl.useProgram(boxProgram);

    const box = createBox();
    const posBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.positions);
    const nrmBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.normals);
    const colBuf = createBuffer(gl, gl.ARRAY_BUFFER, box.colors);
    const idxBuf = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, box.line_indices);

    setAttribute(gl, posBuf, gl.getAttribLocation(boxProgram, "aPosition"), 3);
    setAttribute(gl, nrmBuf, gl.getAttribLocation(boxProgram, "aNormal"), 3);
    setAttribute(gl, colBuf, gl.getAttribLocation(boxProgram, "aColor"), 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

    const uMVP = gl.getUniformLocation(boxProgram, "uModelViewProjection");
    const uNormal = gl.getUniformLocation(boxProgram, "uNormalMatrix");
    const uLightDir = gl.getUniformLocation(boxProgram, "uLightDir");
    gl.uniform3f(uLightDir, 0, 0.7, 1.0);

    gl.bindVertexArray(null);

    // ---- Baker VAO (full-screen quad) ----
    const bakerVao = gl.createVertexArray();
    gl.bindVertexArray(bakerVao);

    const quadVerts = new Float32Array([
        -1, -1, 1, -1, 1, 1,
        -1, -1, 1, 1, -1, 1,
    ]);
    const quadBuf = createBuffer(gl, gl.ARRAY_BUFFER, quadVerts);
    setAttribute(gl, quadBuf, gl.getAttribLocation(bakerProgram, "aPosition"), 2);

    gl.bindVertexArray(null);

    // ---- 3D Texture ----
    const voronoiTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, voronoiTexture);
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8UI, texture_size, texture_size, texture_size);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_3D, null);

    const bakeFBO = gl.createFramebuffer();
    const uSliceZ = gl.getUniformLocation(bakerProgram, "uSliceZ");

    // ---- Initial bake ----
    bakeTexture(gl, bakerProgram, bakerVao, bakeFBO, voronoiTexture, texture_size, uSliceZ);

    // --- Raymarch VAO ---
    const raycastVao = gl.createVertexArray();
    gl.bindVertexArray(raycastVao);
    gl.useProgram(raymarchProgram);

    const faceBuf = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, box.triangle_indices);

    setAttribute(gl, posBuf, gl.getAttribLocation(raymarchProgram, "aPosition"), 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuf);

    const uMVP_ray = gl.getUniformLocation(raymarchProgram, "uMVP");
    const uCameraPos_ray = gl.getUniformLocation(raymarchProgram, "uCameraPos");
    const uLightDir_ray = gl.getUniformLocation(raymarchProgram, "uLightDir");
    const uSeedMaskLow = gl.getUniformLocation(raymarchProgram, "uSeedMaskLow");
    const uSeedMaskHigh = gl.getUniformLocation(raymarchProgram, "uSeedMaskHigh");
    const uVolumeTexture = gl.getUniformLocation(raymarchProgram, "uVolumeTexture");

    gl.uniform1i(uVolumeTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, voronoiTexture);

    gl.uniform1f(gl.getUniformLocation(raymarchProgram, "uTextureRes"), texture_size);
    updateSeedMask(gl, uSeedMaskLow, uSeedMaskHigh, enables);
    gl.bindVertexArray(null);

    // ---- Sidebar UI ----
    const ctx = {
        gl,
        raymarchProgram,
        seeds,
        enables,
        uSeedMaskLow,
        uSeedMaskHigh,
        voronoiUBO,
        bakerProgram,
        bakerVao,
        bakeFBO,
        voronoiTexture,
        texture_size,
        uSliceZ,
    };
    updateSeedUI(ctx);
    setupAddSeedForm(ctx);

    // ---- GL state ----
    gl.clearColor(0.04, 0.04, 0.06, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // ---- Matrices ----
    const proj = mat4Create();
    const view = mat4Create();
    const mv = mat4Create();
    const mvp = mat4Create();
    const norm = mat4Create();


    // Persistent model rotation matrix — accumulated over time
    const modelRotation = mat4Create();
    const temp = mat4Create();

    // Apply an initial tilt so we see three faces
    mat4RotateX(modelRotation, modelRotation, 0.35);

    // Resize canvas to match display size (handles high-DPI)
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr | 0;
    const h = canvas.clientHeight * dpr | 0;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Projection
    const aspect = canvas.width / canvas.height;
    mat4Perspective(proj, Math.PI / 6, aspect, 0.1, 100);
    
    // Pre-allocated model-space vectors for raymarching
    const modelRotationInv = mat4Create();
    const camPosModel = new Float32Array(3);
    const lightDirModel = new Float32Array(3);
    const lightDirWorld = [0.0, 1.0, 1.0];  // world-space light direction

    function frame() {
        let dx = 0, dy = 0;

        if (input.interacting) {
            dx = input.deltaX;
            dy = input.deltaY;
            input.deltaX = 0;
            input.deltaY = 0;
        } else {
            dx = input.velocityX;
            dy = input.velocityY;
            input.velocityX *= 0.95;
            input.velocityY *= 0.95;
            if (Math.abs(input.velocityX) < 0.0001) input.velocityX = 0;
            if (Math.abs(input.velocityY) < 0.0001) input.velocityY = 0;
        }

        if (dx !== 0 || dy !== 0) {
            const inc = mat4Create();
            mat4RotateY(inc, inc, dx);
            mat4RotateX(inc, inc, dy);
            mat4Multiply(temp, inc, modelRotation);
            modelRotation.set(temp);
        }

        // Update view matrix with current zoom
        cam_pos = [0, 0, input.zoom];
        mat4LookAt(view, cam_pos, [0, 0, 0], [0, 1, 0]);

        // MVP
        mat4Multiply(mv, view, modelRotation);
        mat4Multiply(mvp, proj, mv);

        // Normal matrix (inverse-transpose of model-view)
        mat4InverseTranspose(norm, mv);

        // Camera in model space
        mat4Transpose(modelRotationInv, modelRotation);
        camPosModel[0] = cam_pos[0] * modelRotationInv[0] + cam_pos[1] * modelRotationInv[4] + cam_pos[2] * modelRotationInv[8] + modelRotationInv[12];
        camPosModel[1] = cam_pos[0] * modelRotationInv[1] + cam_pos[1] * modelRotationInv[5] + cam_pos[2] * modelRotationInv[9] + modelRotationInv[13];
        camPosModel[2] = cam_pos[0] * modelRotationInv[2] + cam_pos[1] * modelRotationInv[6] + cam_pos[2] * modelRotationInv[10] + modelRotationInv[14];

        // Light direction in model space (rotation only, no translation — it's a direction, not a point)
        lightDirModel[0] = lightDirWorld[0] * modelRotationInv[0] + lightDirWorld[1] * modelRotationInv[4] + lightDirWorld[2] * modelRotationInv[8];
        lightDirModel[1] = lightDirWorld[0] * modelRotationInv[1] + lightDirWorld[1] * modelRotationInv[5] + lightDirWorld[2] * modelRotationInv[9];
        lightDirModel[2] = lightDirWorld[0] * modelRotationInv[2] + lightDirWorld[1] * modelRotationInv[6] + lightDirWorld[2] * modelRotationInv[10];

        // Draw box wireframe
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.bindVertexArray(boxVao);
        gl.useProgram(boxProgram);
        gl.uniformMatrix4fv(uMVP, false, mvp);
        gl.uniformMatrix4fv(uNormal, false, norm);
        gl.drawElements(gl.LINES, box.line_count, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        // Raycast pass
        gl.bindVertexArray(raycastVao);
        gl.useProgram(raymarchProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, voronoiTexture);
        gl.uniformMatrix4fv(uMVP_ray, false, mvp);
        gl.uniform3fv(uCameraPos_ray, camPosModel);
        gl.uniform3fv(uLightDir_ray, lightDirModel);
        gl.disable(gl.CULL_FACE);
        gl.drawElements(gl.TRIANGLES, box.triangle_count, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.CULL_FACE);
        gl.bindVertexArray(null);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();