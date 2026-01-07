function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(
      `Failed to compile ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader: ${info}`
    );
  }
  return shader;
}
function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create WebGL program");
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`Failed to link program: ${info}`);
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}
const INSTANCED_ARRAYS_WRAPPER_MAP = /* @__PURE__ */ new WeakMap();
function getInstancedArrays(gl) {
  if (gl instanceof WebGL2RenderingContext) return gl;
  const cached = INSTANCED_ARRAYS_WRAPPER_MAP.get(gl);
  if (cached) return cached;
  const ext = gl.getExtension("ANGLE_instanced_arrays");
  if (!ext) return void 0;
  const wrapper = {
    drawArraysInstanced: ext.drawArraysInstancedANGLE.bind(ext),
    drawElementsInstanced: ext.drawElementsInstancedANGLE.bind(ext),
    vertexAttribDivisor: ext.vertexAttribDivisorANGLE.bind(ext)
  };
  INSTANCED_ARRAYS_WRAPPER_MAP.set(gl, wrapper);
  return wrapper;
}
const VERTEX_ARRAY_OBJECT_WRAPPER_MAP = /* @__PURE__ */ new WeakMap();
function getVertexArrayObject(gl) {
  if (gl instanceof WebGL2RenderingContext) return gl;
  const cached = VERTEX_ARRAY_OBJECT_WRAPPER_MAP.get(gl);
  if (cached) return cached;
  const ext = gl.getExtension("OES_vertex_array_object");
  if (!ext) return null;
  const wrapper = {
    bindVertexArray: ext.bindVertexArrayOES.bind(ext),
    createVertexArray: ext.createVertexArrayOES.bind(ext),
    deleteVertexArray: ext.deleteVertexArrayOES.bind(ext)
  };
  VERTEX_ARRAY_OBJECT_WRAPPER_MAP.set(gl, wrapper);
  return wrapper;
}

function assertedNotNullish(value, message) {
  if (value === void 0 || value === null) throw new Error(message);
  return value;
}
const kindToUniformFnName = (kind) => {
  switch (kind[0]) {
    // mat
    case "m":
      return "Matrix" + kind.slice(3) + "fv";
    // sampler/booleans/integer
    case "s":
    case "b":
    case "i":
      return (kind.match(/\d/)?.[0] ?? "1") + "i";
    // unsigned integers
    case "u":
      return (kind[4] || "1") + "ui";
    // vec
    case "v":
      return kind[3] + "f";
    default:
      switch (kind) {
        case "float":
          return "1f";
        case "uint":
          return "1ui";
        default:
          return "1i";
      }
  }
};
const kindToSize = (kind) => {
  switch (kind[0]) {
    case "m":
      const [a, b] = kind.match(/\d+/g).map(Number);
      return a * (b ?? a);
    case "v":
    case "i":
    case "b":
    case "u":
      const match = kind.match(/\d/);
      return match ? +match[0] : 1;
    default:
      return 1;
  }
};
const isMatKind = (kind) => kind.includes("mat");
const isSamplerKind = (kind) => kind.includes("sampler");
function createTexture(gl, {
  target = "TEXTURE_2D",
  internalFormat = "RGBA",
  format = "RGBA",
  type = "UNSIGNED_BYTE",
  minFilter = "NEAREST",
  magFilter = "NEAREST",
  wrapS = "CLAMP_TO_EDGE",
  wrapT = "CLAMP_TO_EDGE",
  width,
  height
}, data) {
  const texture = gl.createTexture();
  function getTextureConstant(name2) {
    if (!(name2 in gl)) {
      throw new Error(`Attempted to create webgl2-only texture (${name2}) in webgl1`);
    }
    return gl[name2];
  }
  gl.bindTexture(gl[target], texture);
  gl.texImage2D(
    gl[target],
    0,
    getTextureConstant(internalFormat),
    width,
    height,
    0,
    getTextureConstant(format),
    getTextureConstant(type),
    null
  );
  console.log(minFilter);
  gl.texParameteri(gl[target], gl.TEXTURE_MIN_FILTER, gl[minFilter]);
  gl.texParameteri(gl[target], gl.TEXTURE_MAG_FILTER, gl[magFilter]);
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_S, gl[wrapS]);
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_T, gl[wrapT]);
  return texture;
}
const FRAMEBUFFER_ATTACHMENT_MAP = {
  color: "COLOR_ATTACHMENT0",
  depth: "DEPTH_ATTACHMENT",
  stencil: "STENCIL_ATTACHMENT",
  depthStencil: "DEPTH_STENCIL_ATTACHMENT"
};
class FramebufferError extends Error {
  constructor(gl, status) {
    let errorMessage = `Framebuffer '${name}' not complete. Status: `;
    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        errorMessage += "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        errorMessage += "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        errorMessage += "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
        break;
      case gl.FRAMEBUFFER_UNSUPPORTED:
        errorMessage += "FRAMEBUFFER_UNSUPPORTED";
        break;
      default:
        errorMessage += `Unknown (${status})`;
    }
    super(errorMessage);
  }
}
function createFramebuffer(gl, { attachment, texture, ...options }) {
  texture ??= createTexture(gl, options);
  const framebuffer = assertedNotNullish(
    gl.createFramebuffer(),
    `Failed to create framebuffer: ${name}`
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    // Determine attachment point based on attachment kind
    gl[FRAMEBUFFER_ATTACHMENT_MAP[attachment]],
    gl.TEXTURE_2D,
    texture,
    0
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new FramebufferError(gl, status);
  }
  return {
    texture,
    framebuffer
  };
}
function createUpsertMap(constructor) {
  const map = new (constructor ?? Map)();
  return Object.assign(map, {
    getOrInsert(key, value) {
      let result = map.get(key);
      if (result) {
        return result;
      }
      result = value();
      map.set(key, result);
      return result;
    }
  });
}

function forEach(value, callback) {
  let index = 0;
  for (const key in value) {
    callback(value[key], key, index);
    index++;
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    callback(value[key], key, index);
    index++;
  }
}
function map(value, callback) {
  const result = {};
  forEach(value, (value2, key, index) => {
    result[key] = callback(value2, key, index);
  });
  return result;
}

let index = 0;
const PREFIX = "VIEW_GL_ALIAS";
const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf("firefox") >= 0;
const SYMBOL_MAP = createUpsertMap(IS_FIREFOX ? Map : WeakMap);
function toID(key) {
  if (typeof key === "string") {
    return key;
  }
  if (typeof key === "symbol") {
    return SYMBOL_MAP.getOrInsert(key, () => `${PREFIX}_${index++}`);
  }
  return key.toString();
}
function view(gl, program, schema, options) {
  return {
    uniforms: !schema.uniforms ? void 0 : uniformView(gl, program, schema.uniforms),
    attributes: !schema.attributes ? void 0 : attributeView(gl, program, schema.attributes, options),
    interleavedAttributes: !schema.interleavedAttributes ? void 0 : interleavedAttributeView(gl, program, schema.interleavedAttributes, options),
    buffers: !schema.buffers ? void 0 : bufferView(gl, schema.buffers)
  };
}
function uniformView(gl, program, schema) {
  return map(schema, ({ kind, size }, key) => {
    const name = toID(key);
    const location = gl.getUniformLocation(program, name);
    if (isSamplerKind(kind)) {
      return {
        set(arg) {
          gl.uniform1i(location, arg);
        }
      };
    }
    const fnName = `uniform${kindToUniformFnName(kind)}${size ? "v" : ""}`;
    const fn = gl[fnName].bind(gl);
    if (isMatKind(kind)) {
      return {
        set(...args) {
          fn(location, false, args[0]);
        }
      };
    }
    return {
      set(...args) {
        fn(location, ...args);
      }
    };
  });
}
function handleAttribute(gl, location, size, stride, offset, type, instanced) {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl[type], false, stride, offset);
  if (instanced) {
    assertedNotNullish(getInstancedArrays(gl)).vertexAttribDivisor(location, 1);
  }
}
function attributeView(gl, program, schema, { signal } = {}) {
  const attributes = map(
    schema,
    ({ kind, instanced, buffer = assertedNotNullish(gl.createBuffer()) }, key) => {
      const name = toID(key);
      const location = gl.getAttribLocation(program, name);
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`);
      }
      const size = kindToSize(kind);
      const type = kind.startsWith("i") ? "INT" : "FLOAT";
      return {
        buffer,
        bind() {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          handleAttribute(gl, location, size, 0, 0, type, instanced);
        },
        dispose() {
          gl.deleteBuffer(buffer);
        },
        set(data, usage = "STATIC_DRAW") {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl[usage]);
          return this;
        }
      };
    }
  );
  signal?.addEventListener("abort", function dispose() {
    forEach(attributes, (value) => value.dispose());
  });
  return attributes;
}
function interleavedAttributeView(gl, program, schema, { signal } = {}) {
  const interleavedAttributes = map(schema, ({ layout, instanced }) => {
    let index2 = 0;
    const handles = layout.map((layout2) => {
      const name = toID(layout2.key);
      const location = gl.getAttribLocation(program, name);
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`);
      }
      const size = kindToSize(layout2.kind);
      const offset = index2;
      const type = layout2.kind.startsWith("i") ? "INT" : "FLOAT";
      index2 += size * 4;
      return () => handleAttribute(gl, location, size, stride, offset, type, instanced);
    });
    const stride = index2;
    const buffer = assertedNotNullish(gl.createBuffer());
    let vao = void 0;
    const feature = getVertexArrayObject(gl);
    if (feature) {
      const vertexArray = feature.createVertexArray();
      feature.bindVertexArray(vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const handle of handles) {
        handle();
      }
      feature.bindVertexArray(null);
      vao = {
        unbind() {
          feature.bindVertexArray(null);
        },
        bind() {
          feature.bindVertexArray(vertexArray);
        },
        dispose() {
          feature.deleteVertexArray(vertexArray);
        }
      };
    }
    return {
      bind() {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        if (vao) {
          vao.bind();
        } else {
          for (const handle of handles) {
            handle();
          }
        }
      },
      unbind() {
        if (vao) {
          vao.unbind();
        }
      },
      dispose() {
        gl.deleteBuffer(buffer);
        if (vao) {
          vao.dispose();
        }
      },
      set(value, usage = "STATIC_DRAW") {
        if (vao) {
          vao.bind();
        } else {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        }
        gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage]);
        if (vao) {
          vao.unbind();
        }
      }
    };
  });
  signal?.addEventListener("abort", function dispose() {
    forEach(interleavedAttributes, (value) => value.dispose());
  });
  return interleavedAttributes;
}
function bufferView(gl, schema, { signal } = {}) {
  const buffers = map(schema, ({ target = "ARRAY_BUFFER", usage = "STATIC_DRAW" }) => {
    const buffer = assertedNotNullish(gl.createBuffer());
    return {
      bind() {
        gl.bindBuffer(gl[target], buffer);
      },
      dispose() {
        gl.deleteBuffer(buffer);
      },
      set(data) {
        gl.bindBuffer(gl[target], buffer);
        gl.bufferData(gl[target], data, gl[usage]);
      }
    };
  });
  signal?.addEventListener("abort", function dispose() {
    forEach(buffers, (value) => value.dispose());
  });
  return buffers;
}

function glsl(template, ...slots) {
  return { template, slots, type: "glsl" };
}
const uniform = new Proxy(
  {},
  {
    get(target, property) {
      if (typeof property === "symbol") return target[property];
      return (key, options) => ({
        type: "uniform",
        key,
        kind: property,
        ...options
      });
    }
  }
);
const attribute = new Proxy(
  {},
  {
    get(target, property) {
      if (typeof property === "symbol") return target[property];
      return (key, options) => ({
        type: "attribute",
        key,
        kind: property,
        ...options
      });
    }
  }
);
function interleave(key, layout, { instanced, buffer } = {}) {
  return {
    type: "interleavedAttribute",
    key,
    // remove instanced- and type-property
    layout: layout.map(({ key: key2, kind }) => ({
      key: key2,
      kind
    })),
    instanced: !!instanced,
    buffer
  };
}
function compile(gl, vertex, fragment, options) {
  const _vertex = resolveGLSLTag(vertex, options);
  const _fragment = resolveGLSLTag(fragment, options);
  const schema = {
    uniforms: {
      ..._vertex.schema.uniforms,
      ..._fragment.schema.uniforms
    },
    attributes: {
      ..._vertex.schema.attributes,
      ..._fragment.schema.attributes
    },
    interleavedAttributes: {
      ..._vertex.schema.interleavedAttributes,
      ..._fragment.schema.interleavedAttributes
    }
  };
  for (const kind in options?.schema) {
    const schemaKind = schema[kind];
    const configSchemaKind = options?.schema[kind];
    for (const key in configSchemaKind) {
      schemaKind[key] = {
        ...schemaKind[key],
        ...configSchemaKind[key]
      };
    }
  }
  try {
    const program = createProgram(gl, _vertex.template, _fragment.template);
    return {
      program,
      schema,
      view: view(gl, program, schema),
      vertex: _vertex.template,
      fragment: _fragment.template
    };
  } catch (error) {
    console.error("Error while creating WebGLProgram - vertex\n\n", _vertex.template);
    console.error("Error while creating WebGLProgram - fragment\n\n", _fragment.template);
    throw error;
  }
}
function resolveGLSLTag(tag, options) {
  return {
    template: compile.toString(tag, options),
    schema: compile.toSchema(tag)
  };
}
compile.toSchema = function(tag) {
  const result = {
    uniforms: {},
    attributes: {},
    interleavedAttributes: {}
  };
  tag.slots.forEach(function handleSlot(slot) {
    if (typeof slot !== "object") {
      return;
    }
    if (Array.isArray(slot)) {
      slot.forEach(handleSlot);
      return;
    }
    if (slot.type === "glsl") {
      const { uniforms, attributes, interleavedAttributes } = compile.toSchema(slot);
      result.uniforms = {
        ...result.uniforms,
        ...uniforms
      };
      result.attributes = {
        ...result.attributes,
        ...attributes
      };
      result.interleavedAttributes = {
        ...result.interleavedAttributes,
        ...interleavedAttributes
      };
      return;
    }
    const { key: name, type, ...rest } = slot;
    result[`${type}s`][name] = rest;
  });
  return result;
};
compile.toString = function({ template: [initial, ...rest], slots }, config) {
  const v300 = config?.webgl2 ?? !!initial?.startsWith("#version 300 es");
  let template = initial ?? "";
  for (let i = 0; i < rest.length; i++) {
    template += `${resolveGlslSlotToString(slots[i], v300)}${rest[i]}`;
  }
  return template;
};
function resolveGlslSlotToString(slot, v300) {
  if (typeof slot !== "object") {
    return toID(slot);
  }
  if (Array.isArray(slot)) {
    return slot.map((slot2) => resolveGlslSlotToString(slot2, v300)).join("");
  }
  switch (slot.type) {
    case "glsl":
      return compile.toString(slot);
    case "interleavedAttribute":
      return slot.layout.reduce(
        (a, v) => v300 ? `${a}in ${v.kind} ${toID(v.key)};
` : `${a}attribute ${v.kind} ${toID(v.key)};
`,
        ""
      );
    case "uniform":
      if ("size" in slot) {
        return `${slot.type} ${slot.kind} ${toID(slot.key)}[${slot.size}];`;
      }
      return `${slot.type} ${slot.kind} ${toID(slot.key)};`;
  }
  if (slot.type === "attribute") {
    return `${v300 ? "in" : slot.type} ${slot.kind} ${toID(slot.key)};`;
  }
  throw new Error(`Unexpected slot: ${JSON.stringify(slot)}`);
}
const QUAD_FLOAT_ARRAY = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const QUAD_BUFFER_MAP = createUpsertMap(WeakMap);
compile.toQuad = function(gl, fragment, options) {
  const buffer = QUAD_BUFFER_MAP.getOrInsert(gl, gl.createBuffer.bind(gl));
  const webgl2 = options?.webgl2 ?? fragment.template[0]?.startsWith("#version 300 es");
  const vertex = webgl2 ? glsl`#version 300 es
precision mediump float;

${attribute.vec2("a_quad", { buffer })}

out vec2 v_uv;

void main() {
  v_uv = a_quad;
  gl_Position = vec4(v_uv, 0.0, 1.0);
}` : glsl`precision mediump float;

${attribute.vec2("a_quad", { buffer })}

varying vec2 v_uv;

void main() {
  v_uv = a_quad;
  gl_Position = vec4(v_uv, 0.0, 1.0);
}`;
  const result = compile(gl, vertex, fragment, options);
  result.view.attributes.a_quad.set(QUAD_FLOAT_ARRAY);
  return result;
};

export { attribute as a, createFramebuffer as b, compile as c, uniformView as d, attributeView as e, glsl as g, interleave as i, uniform as u };
