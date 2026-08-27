function isWebGL2RenderingContext(gl) {
  return typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
}
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
  if (isWebGL2RenderingContext(gl)) return gl;
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
  if (isWebGL2RenderingContext(gl)) return gl;
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
function forEachObject(value, callback) {
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
function mapObject(value, callback) {
  const result = {};
  forEachObject(value, (value2, key, index) => {
    result[key] = callback(value2, key, index);
  });
  return result;
}

let index = 0;
const PREFIX = "VIEW_GL_ALIAS";
const HAS_WEAK_SYMBOL = (() => {
  try {
    const symbol = Symbol();
    (/* @__PURE__ */ new WeakMap()).set(symbol, "");
    return true;
  } catch {
    return false;
  }
})();
const SYMBOL_MAP = createUpsertMap(HAS_WEAK_SYMBOL ? WeakMap : Map);
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
    buffers: !schema.buffers ? void 0 : bufferView(gl, schema.buffers),
    vao(participants) {
      return vaoView(gl, participants, options);
    }
  };
}
function bindDefaultVertexArray(gl) {
  const feature = getVertexArrayObject(gl);
  if (!feature) {
    return () => {
    };
  }
  const previous = gl.getParameter(VERTEX_ARRAY_BINDING);
  feature.bindVertexArray(null);
  return () => feature.bindVertexArray(previous);
}
function vaoView(gl, participants, { signal } = {}) {
  const feature = getVertexArrayObject(gl);
  const methods = !feature ? {
    bind() {
      const restores = participants.map((participant) => participant.applyToVertexArray());
      participants.forEach((participant) => participant.applyToContext?.());
      return once(() => restores.forEach((restore) => restore()));
    },
    unbind() {
    },
    dispose() {
    }
  } : (() => {
    const vertexArray = assertedNotNullish(feature.createVertexArray());
    const previous = gl.getParameter(VERTEX_ARRAY_BINDING);
    feature.bindVertexArray(vertexArray);
    for (const participant of participants) {
      participant.applyToVertexArray();
    }
    feature.bindVertexArray(previous);
    return {
      bind() {
        const previousVertexArray = gl.getParameter(
          VERTEX_ARRAY_BINDING
        );
        feature.bindVertexArray(vertexArray);
        participants.forEach((participant) => participant.applyToContext?.());
        return once(() => feature.bindVertexArray(previousVertexArray));
      },
      unbind() {
        feature.bindVertexArray(null);
      },
      dispose() {
        feature.deleteVertexArray(vertexArray);
      }
    };
  })();
  signal?.addEventListener("abort", () => methods.dispose());
  return methods;
}
function uniformView(gl, program, schema) {
  return mapObject(schema, ({ kind, size }, key) => {
    const name = toID(key);
    if (isSamplerKind(kind)) {
      const location2 = gl.getUniformLocation(program, name);
      return {
        set(arg) {
          gl.uniform1i(location2, arg);
        }
      };
    }
    if (size) {
      const bulkFnName = `uniform${kindToUniformFnName(kind)}v`;
      const bulkFn = gl[bulkFnName].bind(gl);
      const bulkLocation = gl.getUniformLocation(program, name);
      const elementFnName = `uniform${kindToUniformFnName(kind)}`;
      const elementFn = gl[elementFnName].bind(gl);
      const elements = [];
      for (let i = 0; i < size; i++) {
        const location2 = gl.getUniformLocation(program, `${name}[${i}]`);
        elements[i] = {
          set(...args) {
            elementFn(location2, ...args);
          }
        };
      }
      return Object.assign(elements, {
        set(arg) {
          bulkFn(bulkLocation, arg);
        }
      });
    }
    const location = gl.getUniformLocation(program, name);
    const fnName = `uniform${kindToUniformFnName(kind)}`;
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
const FORMAT_TO_GL_TYPE = {
  float32: "FLOAT",
  int32: "INT",
  uint32: "UNSIGNED_INT",
  int16: "SHORT",
  uint16: "UNSIGNED_SHORT",
  int8: "BYTE",
  uint8: "UNSIGNED_BYTE"
};
const FORMAT_BYTE_SIZE = {
  float32: 4,
  int32: 4,
  uint32: 4,
  int16: 2,
  uint16: 2,
  int8: 1,
  uint8: 1
};
function defaultFormat(kind) {
  if (kind.startsWith("u")) return "uint32";
  if (kind.startsWith("i")) return "int32";
  return "float32";
}
function handleAttribute(gl, location, size, stride, offset, glType, isIntegerKind, normalized, instanced) {
  gl.enableVertexAttribArray(location);
  if (isIntegerKind) {
    gl.vertexAttribIPointer(location, size, gl[glType], stride, offset);
  } else {
    gl.vertexAttribPointer(location, size, gl[glType], normalized, stride, offset);
  }
  const instancedArrays = getInstancedArrays(gl);
  if (instanced) {
    assertedNotNullish(instancedArrays).vertexAttribDivisor(location, 1);
  } else if (instancedArrays) {
    instancedArrays.vertexAttribDivisor(location, 0);
  }
}
const VERTEX_ATTRIB_ARRAY_DIVISOR = 35070;
const VERTEX_ARRAY_BINDING = 34229;
function readDivisor(gl, location) {
  return getInstancedArrays(gl) ? gl.getVertexAttrib(location, VERTEX_ATTRIB_ARRAY_DIVISOR) : 0;
}
function once(restore) {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    restore();
  };
}
function attributeView(gl, program, schema, { signal } = {}) {
  const attributes = mapObject(
    schema,
    ({
      kind,
      format,
      normalized = false,
      instanced,
      buffer = assertedNotNullish(gl.createBuffer())
    }, key) => {
      const name = toID(key);
      const location = gl.getAttribLocation(program, name);
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`);
      }
      const size = kindToSize(kind);
      const resolvedFormat = format ?? defaultFormat(kind);
      const glType = FORMAT_TO_GL_TYPE[resolvedFormat];
      const isIntKind = kind.startsWith("i") || kind.startsWith("u");
      function applyToVertexArray() {
        const previousDivisor = readDivisor(gl, location);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        handleAttribute(gl, location, size, 0, 0, glType, isIntKind, normalized, instanced);
        return once(() => {
          getInstancedArrays(gl)?.vertexAttribDivisor(location, previousDivisor);
        });
      }
      return {
        buffer,
        applyToVertexArray,
        bind() {
          const restoreVertexArray = bindDefaultVertexArray(gl);
          const restore = applyToVertexArray();
          return once(() => {
            restore();
            restoreVertexArray();
          });
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
    forEachObject(attributes, (value) => value.dispose());
  });
  return attributes;
}
function constantSource(gl, layout, locations) {
  const setters = layout.map((entry, index2) => {
    const size = kindToSize(entry.kind);
    const name = toID(entry.key);
    if (isMatKind(entry.kind) || size > 4) {
      throw new Error(
        `'${name}' is a ${entry.kind}, which cannot be a constant attribute: vertexAttrib* takes at most 4 floats and has no matrix form. Use the buffer source for it.`
      );
    }
    let values = [];
    const fn = gl[`vertexAttrib${size}f`].bind(gl);
    return {
      name,
      location: locations[index2],
      write: () => {
        if (values.length) {
          fn(locations[index2], ...values);
        }
      },
      methods: {
        set(...args) {
          values = args;
        }
      }
    };
  });
  return Object.assign(Object.fromEntries(setters.map((setter) => [setter.name, setter.methods])), {
    applyToVertexArray() {
      const restores = setters.map(({ location }) => {
        const wasEnabled = gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
        gl.disableVertexAttribArray(location);
        return () => wasEnabled ? gl.enableVertexAttribArray(location) : void 0;
      });
      return once(() => restores.forEach((restore) => restore()));
    },
    applyToContext() {
      setters.forEach((setter) => setter.write());
    },
    bind() {
      const restoreVertexArray = bindDefaultVertexArray(gl);
      const restore = this.applyToVertexArray();
      this.applyToContext();
      return once(() => {
        restore();
        restoreVertexArray();
      });
    }
  });
}
function interleavedAttributeView(gl, program, schema, { signal } = {}) {
  const interleavedAttributes = mapObject(schema, ({ layout }) => {
    let index2 = 0;
    const locations = [];
    const handles = layout.map((layout2) => {
      const name = toID(layout2.key);
      const location = gl.getAttribLocation(program, name);
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`);
      }
      locations.push(location);
      const size = kindToSize(layout2.kind);
      const offset = index2;
      const resolvedFormat = layout2.format ?? defaultFormat(layout2.kind);
      const glType = FORMAT_TO_GL_TYPE[resolvedFormat];
      const isIntKind = layout2.kind.startsWith("i") || layout2.kind.startsWith("u");
      const normalized = layout2.normalized ?? false;
      index2 += size * FORMAT_BYTE_SIZE[resolvedFormat];
      return (divisor) => handleAttribute(
        gl,
        location,
        size,
        stride,
        offset,
        glType,
        isIntKind,
        normalized,
        divisor === 1
      );
    });
    const stride = index2;
    const buffer = assertedNotNullish(gl.createBuffer());
    function applyToVertexArray(divisor) {
      const previousDivisors = locations.map(
        (location) => [location, readDivisor(gl, location)]
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const handle of handles) {
        handle(divisor);
      }
      return once(() => {
        const instancedArrays = getInstancedArrays(gl);
        previousDivisors.forEach(([location, previous]) => {
          instancedArrays?.vertexAttribDivisor(location, previous);
        });
      });
    }
    let constant;
    function bufferSource(divisor) {
      const apply = () => applyToVertexArray(divisor);
      return {
        applyToVertexArray: apply,
        bind() {
          const restoreVertexArray = bindDefaultVertexArray(gl);
          const restore = apply();
          return once(() => {
            restore();
            restoreVertexArray();
          });
        }
      };
    }
    return {
      buffer: Object.assign(bufferSource(0), {
        /** The same buffer, stepped once per instance instead of once per vertex. */
        perInstance: bufferSource(1),
        set(value, usage = "STATIC_DRAW") {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage]);
        }
      }),
      // Lazy: a layout key can be perfectly good in a buffer and impossible as
      // a constant, and finding that out should wait until someone asks for one.
      get constant() {
        return constant ??= constantSource(gl, layout, locations);
      },
      dispose() {
        gl.deleteBuffer(buffer);
      }
    };
  });
  signal?.addEventListener("abort", function dispose() {
    forEachObject(interleavedAttributes, (value) => value.dispose());
  });
  return interleavedAttributes;
}
function bufferView(gl, schema, { signal } = {}) {
  const buffers = mapObject(schema, ({ target = "ARRAY_BUFFER", usage = "STATIC_DRAW" }) => {
    const buffer = assertedNotNullish(gl.createBuffer());
    function applyToVertexArray() {
      const previousBuffer = gl.getParameter(gl[`${target}_BINDING`]);
      gl.bindBuffer(gl[target], buffer);
      return once(() => {
        gl.bindBuffer(gl[target], previousBuffer);
      });
    }
    return {
      applyToVertexArray,
      bind() {
        const restoreVertexArray = bindDefaultVertexArray(gl);
        const restore = applyToVertexArray();
        return once(() => {
          restore();
          restoreVertexArray();
        });
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
    forEachObject(buffers, (value) => value.dispose());
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
