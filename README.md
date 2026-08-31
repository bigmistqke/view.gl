# 👁️ @bigmistqke/view.gl

🔧 Utilities for managing WebGL resources: uniforms, (interleaved) attributes and buffers.

- schema-based resource management [`view-gl`](#️-viewgl)
- compose schema and shader simultaneously via a tag template literal [`view-gl/tag`](#️-viewgltag)

## Table of Contents

- 📦 [Install](#-install)
- 👁️ [view.gl](#️-viewgl)
  - 🚀 [Basic Usage](#-basic-usage)
  - 👁️ [view](#️-view)
    - 📋 [ViewSchema](#-viewschema)
  - 👀 [Resource Views](#-resource-views)
    - 🎯 [uniformView](#-uniformview)
      - 📋 [UniformSchema](#-uniformschema)
    - 📝 [attributeView](#-attributeview)
      - 📋 [AttributeSchema](#-attributeschema)
    - 🔗 [interleavedAttributeView](#-interleavedattributeview)
      - 📋 [InterleavedAttributeSchema](#-interleavedattributeschema)
    - 🗂️ [bufferView](#-bufferview)
      - 📋 [BufferSchema](#-bufferschema)
- 🏷️ [view.gl/tag](#️-viewgltag)
  - 🚀 [Basic Usage](#-basic-usage-1)
  - 📝 [glsl](#-glsl)
    - 🧩 [GLSL Fragment](#-glsl-fragment)
    - 🔒 [Symbol Variables](#-symbol-variables)
    - [WebGL Version Support](#webgl-version-support)
  - 🏷️ [Resource Tokens](#️-resource-tokens)
    - 🎯 [uniform[kind](name, options?)](#-uniformkindname-options)
    - 📝 [attribute[kind](name, options?)](#-attributekindname-options)
    - 🔗 [interleave(name, layout, options?)](#-interleavename-layout-options)
  - ⚙️ [compile(gl, vertex, fragment)](#️-compilegl-vertex-fragment)
    - 🔄 [compile.toQuad(gl, fragment)](#-compiletoquadgl-fragment-options)
    - 🔍 [compile.toString(shader)](#-compiletostringshader)
    - 📋 [compile.toSchema(shader)](#-compiletoschemaschader)
- 🛠️ [Utils](#️-utils)
  - 🏗️ [createProgram](#️-createprogram)
  - 🖼️ [createTexture](#️-createtexture)
  - 🖥️ [createFramebuffer](#️-createframebuffer)
- 🔍 [WebGL Type Compatibility](#-webgl-type-compatibility)
  - 🎯 [Uniform Types](#-uniform-types)
  - 📝 [Attribute Types](#-attribute-types)

## 📦 Install

```shell
npm install @bigmistqke/view.gl
```
```shell
pnpm add @bigmistqke/view.gl
```
```shell
yarn add @bigmistqke/view.gl
```
```shell
bun add @bigmistqke/view.gl
```

## 👁️ view.gl

The view system provides type-safe WebGL resource management for uniforms and attributes

### 🚀 Basic Usage

```typescript
const { uniforms, attributes } = view(gl, program, {
  uniforms: {
    time: { kind: 'float' },
    resolution: { kind: 'vec2' },
  },
  attributes: {
    position: { kind: 'vec3' },
    uv: { kind: 'vec2' },
  },
})

// Type-safe uniform setting
uniforms.time.set(performance.now())
uniforms.resolution.set(canvas.width, canvas.height)

// Attribute management
attributes.position.set(positionData)
attributes.position.bind()
```

### 👁️ view

The `view()` function creates type-safe WebGL resource managers from a schema.

```typescript
const { uniforms, attributes } = view(gl, program, schema)
```

**Parameters:**

- `gl`: WebGL rendering context
- `program`: Compiled WebGL program
- `schema`: see [`ViewSchema`](#viewschema)

**Returns:**

- `uniforms`: Type-safe uniform setters
- `attributes`: Attribute managers with buffer handling
- `dispose`: Deletes everything the view made — see [Disposal](#-disposal)

#### 📋 ViewSchema
The complete schema object that defines all WebGL resources. Contains mappings for:
- [`UniformSchema`](#-uniformschema) - uniform variable definitions
- [`AttributeSchema`](#-attributeschema) - vertex attribute definitions  
- [`InterleavedAttributeSchema`](#-interleavedattributeschema) - interleaved vertex data definitions

A schema names what the program has names for, so buffers are not part of it: a
buffer has no name in the source to resolve against the program, and its lifetime
is rarely a program's — the same buffer often feeds several. Build one with
[`bufferView`](#-bufferview) and hand it to `vao()` alongside the attributes.

<details>
<summary>TypeScript Types</summary>

```typescript
interface ViewSchema {
  uniforms: UniformSchema
  attributes: AttributeSchema
  interleavedAttributes: InterleavedAttributeSchema
}
```

</details>

### 🗑️ Disposal

Everything that creates a WebGL resource takes an `AbortSignal` and offers a
`dispose()`, and the two are the same teardown reached two ways:

```typescript
const controller = new AbortController()

const { view, dispose } = compile(gl, vertex, fragment, { signal: controller.signal })
const buffers = bufferView(gl, { indices: {} }, { signal: controller.signal })
const target = createFramebuffer(gl, definition, { signal: controller.signal })

controller.abort() // deletes the program, the buffers, the vertex arrays, the framebuffer
```

Two rules make this safe to reach for.

**Only what it made.** A resource handed in from outside is borrowed, never
deleted: a buffer named by an attribute schema, a texture passed to
`createFramebuffer`. Those belong to whoever created them, and the same buffer
often feeds several views. Delete one out from under its owner and WebGL does
not fault where it happened — the object survives while it is bound, so the
handle is invalidated and the *other* view fails later, on its next upload.

**Once.** Every `dispose()` is idempotent. Disposing by hand and then aborting,
or aborting twice, deletes each resource exactly once.

| creates | disposed by |
| --- | --- |
| `view()` | its own attribute and layout buffers, and vertex arrays still held from `vao()` |
| `compile()` | the program, and its view |
| `attributeView` / `interleavedAttributeView` | the buffer, unless the schema named one |
| `bufferView` | its buffers |
| `vaoView` | the vertex array, never its participants |
| `createProgram` | the program |
| `createTexture` | the texture |
| `createFramebuffer` | the framebuffer, and the texture unless one was passed in |

`uniformView` takes no signal: a uniform location is not a resource, so there is
nothing to delete.

### 👀 Resource Views

Each view type can be imported individually.

#### 🎯 uniformView

Manages shader uniform variables.

```typescript
const uniforms = uniformView(gl, program, {
  time: { kind: 'float' },
  lights: { kind: 'vec3', size: 8 }, // Array uniform: vec3[8]
  transform: { kind: 'mat4' },
})

uniforms.time.set(performance.now())
uniforms.lights.set(lightData) // Takes Float32Array for array uniforms
```

##### 📋 UniformSchema

A mapping of uniform names to their configuration.

- `kind`: GLSL type (see [Uniform Types](#-uniform-types) for full list and WebGL compatibility)
- `size`: Array size (optional) - converts uniform to array type

<details>
<summary>TypeScript Types</summary>

```typescript
type UniformKind =
  | 'float'
  | 'int'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'bvec2'
  | 'bvec3'
  | 'bvec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'sampler2D'
  | 'samplerCube'

interface UniformDefinition {
  kind: UniformKind
  size?: number                               // Creates array uniform with Float32Array setter
}

type UniformSchema = Record<string | symbol, UniformDefinition>
```

</details>

#### 📝 attributeView

Manages vertex attributes with automatic buffer creation and binding.

```typescript
const attributes = attributeView(gl, program, {
  position: { kind: 'vec3' },
  instanceOffset: { kind: 'vec2', instanced: true },
})

attributes.position.set(positionData).bind()
attributes.instanceOffset.set(instanceData).bind()

gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100)
```

`bind()` returns a disposer that restores the state it changed — here the
instancing divisor, which belongs to the attribute location rather than to the
program, and so is inherited by whatever binds there next. Ignore it when the
view owns its locations for the lifetime of the program; call it when they are
shared:

```typescript
const unbind = attributes.instanceOffset.set(instanceData).bind()
gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100)
unbind()
```

##### 📋 AttributeSchema

A mapping of attribute names to their configuration.

- `kind`: GLSL type (see [Attribute Types](#-attribute-types) for full list and WebGL compatibility)
- `instanced`: Boolean (optional) - enables instanced rendering
- `buffer`: Custom WebGLBuffer (optional) - by default it gets created automatically during compilation

<details>
<summary>TypeScript Types</summary>

```typescript
type AttributeKind =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'int'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'

interface AttributeDefinition {
  kind: AttributeKind
  instanced?: boolean                         // Enables vertexAttribDivisor
  buffer?: WebGLBuffer                        // Custom buffer, auto-created if not provided
}

type AttributeSchema = Record<string | symbol, AttributeDefinition>
```

</details>

#### 🔗 interleavedAttributeView

Manages interleaved vertex data with automatic stride/offset calculation.

```typescript
const interleavedAttributes = interleavedAttributeView(gl, program, {
  vertexData: {
    layout: [
      { key: 'position', kind: 'vec3' },
      { key: 'normal', kind: 'vec3' },
      { key: 'uv', kind: 'vec2' },
    ],
  },
})

interleavedAttributes.vertexData.set(interleavedVertexData).bind()
```

Where vertex array objects are available this binds one, and it stays selected
for every later draw — which would then write its own attributes into it. The
disposer returned by `bind()` selects the previous array again:

```typescript
const unbind = interleavedAttributes.vertexData.bind()
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0)
unbind()
```

##### 📋 InterleavedAttributeSchema

A mapping of interleaved buffer names to their layout configuration. Each layout defines multiple attributes packed into a single buffer.

- `layout`: Array of attribute definitions with `key` and `kind` (see [Attribute Types](#-attribute-types))
- `instanced`: Boolean - applies to all attributes in layout
- `buffer`: Custom WebGLBuffer (optional) - by default it gets created automatically during compilation

<details>
<summary>TypeScript Types</summary>

```typescript
interface InterleavedAttributeDefinition {
  layout: Array<{
    key: string | symbol
    kind: AttributeKind
  }>
  instanced?: boolean                         // Applies vertexAttribDivisor to all attributes
  buffer?: WebGLBuffer                        // Custom buffer for interleaved data
}

type InterleavedAttributeSchema = Record<string | symbol, InterleavedAttributeDefinition>
```

</details>

#### 🗂️ bufferView

Manages generic WebGL buffers.

```typescript
const buffers = bufferView(gl, {
  indices: { target: 'ELEMENT_ARRAY_BUFFER' },
  data: { target: 'ARRAY_BUFFER', usage: 'DYNAMIC_DRAW' },
})

buffers.indices.set(indexData)
buffers.data.set(dynamicData)

const unbind = buffers.indices.bind()

// bind() returns a disposer restoring the previous binding for that target.
// Worth calling for ELEMENT_ARRAY_BUFFER, whose binding is recorded in the
// bound vertex array object.
```

##### 📋 BufferSchema
A mapping of buffer names to their configuration. Each buffer has a target type and optional usage pattern.

- `target`: Buffer target (`'ARRAY_BUFFER'`, `'ELEMENT_ARRAY_BUFFER'`)
- `usage`: Usage pattern (`'STATIC_DRAW'`, `'DYNAMIC_DRAW'`, `'STREAM_DRAW'`)

<details>
<summary>TypeScript Types</summary>

```typescript
interface BufferDefinition {
  target: 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER'
  usage?: 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW' // Defaults to 'STATIC_DRAW'
}

type BufferSchema = Record<string | symbol, BufferDefinition>
```

</details>

## 🏷️ view.gl/tag

Type-safe GLSL template literals with automatic schema extraction and view creation.

- **Embedded Resources**: Define uniforms, attributes, and interleaved layouts directly in GLSL
- **Type Inference**: Automatically infers schema types and creates type-safe view
- **Unique Variables**: Prevent naming collisions using symbols for unique shader variables
- **GLSL Composition**: Compose reusable GLSL fragments with automatic dependency resolution

### 🚀 Basic Usage

```typescript
const vertexShader = glsl`
  ${attribute.vec3('position')}
  ${uniform.mat4('model')}
  
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = model * vec4(position, 1.0);
  }
`

const fragmentShader = glsl`
  ${uniform.sampler2D('texture')}
  
  varying vec2 vUv;
  
  void main() {
    gl_FragColor = texture2D(texture, vUv);
  }
`

const { program, schema } = compile(gl, vertexShader, fragmentShader)
```

### 📝 glsl

Template literal processor that handles GLSL code and embedded resources. Supports interpolation of:

- **[Resource tags](#️-resource-tags)**: `uniform.*()`, `attribute.*()`, `interleave()`
- **[GLSL fragments](#-glsl-fragment)**: Reusable shader code snippets
- **[Symbol Variables](#-symbol-variables)**: Unique variable names to prevent collisions
- **Strings**: Interpolated as-is into the shader code
- **Arrays**: Arrays of any supported interpolation types

```typescript
const precision = 'precision mediump float;'
const functionName = Symbol('function')

const shader = glsl`
  ${precision}                                // String interpolated as-is
  ${uniform.vec2('resolution')}
  ${[attribute.vec3('position'), attribute.vec2('uv')]}  // Array interpolation
  
  vec3 ${functionName}(vec2 uv) {             // Symbol interpolated to unique identifier
    return vec3(uv, 0.5);
  }
  
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`
```

#### 🧩 GLSL Fragment

Compose reusable GLSL code fragments to build complex shaders:

```typescript
const lighting = glsl`
  vec3 calculateLighting(vec3 normal, vec3 lightDir) {
    float diff = max(dot(normal, lightDir), 0.0);
    return vec3(diff);
  }
`

const vertexShader = glsl`
  ${attribute.vec3('direction')}
  ${attribute.vec3('normal')}
  ${lighting}                                 // Include the lighting fragment
  
  varying vec3 vLighting;
  
  void main() {
    vLighting = calculateLighting(normal, direction);
  }
`
```

#### 🔒 Symbol Variables

Use JavaScript symbols to prevent naming collisions:

```typescript
const sum = Symbol('sum')

const sumFragment = glsl`
float ${sum}(float a, float b){
  return a + b;
}`

const shader = glsl`
${sumFragment}

void main(){
  float result = ${sum}(1.0, 2.0);
}
`
```

Symbols are converted to unique identifiers during the compilation of the shader.

#### WebGL Version Support

The glsl-function supports both WebGL1 and WebGL2 syntax, automatically using the correct keywords for resource tags:

```typescript
// WebGL1 (default)
const shader = glsl`
  ${attribute.vec3('position')}               // → attribute vec3 position;
  varying vec2 vUv;
`
```

If the shader starts with `#version 300 es`, resource tags generate WebGL2 syntax:

```typescript
// WebGL2
const shader = glsl`#version 300 es
  ${attribute.vec3('position')}               // → in vec3 position;
  out vec2 vUv;
`
```

### 🏷️ Resource Tokens

Utilities for defining WebGL resources directly in GLSL templates. These create metadata that the [`compile`](#️-compilegl-vertex-fragment-overrideschema) consumes to generate the typesafe schema and view.

#### 🎯 uniform[kind](name, options?)

Define uniform variables in GLSL templates (see [Uniform Types](#-uniform-types)).

```typescript
const uniqueTime = Symbol('time')

const shader = glsl`
  ${uniform.float('time')}                    // String key
  ${uniform.float(uniqueTime)}                // Symbol key
  ${uniform.vec3('lights', { size: 8 })}      // Array uniform: vec3[8]
  
  void main() {
    float wave = sin(time * 2.0 + ${uniqueTime});
    vec3 totalLight = vec3(0.0);
    for(int i = 0; i < 8; i++) {
      totalLight += lights[i] * wave;
    }
    gl_FragColor = vec4(totalLight, 1.0);
  }
`
```

**Parameters**:

- `name`: Uniform name (string or symbol for unique variables)
- `options`: Optional configuration object
  - `size`: Array size (creates array uniform with Float32Array setter)

#### 📝 attribute[kind](name, options?)

Define vertex attributes in GLSL templates (see [Attribute Types](#-attribute-types)).

```typescript
const uniquePosition = Symbol('position')

const vertexShader = glsl`
  ${attribute.vec3('position')}               // String key
  ${attribute.vec3(uniquePosition)}           // Symbol key
  ${attribute.vec2('offset', { instanced: true })}
  
  void main() {
    gl_Position = vec4(position + vec3(offset, 0.0), 1.0);
  }
`
```

**Parameters**:

- `name`: Attribute name (string or symbol for unique variables)
- `options`: Optional configuration object
  - `instanced`: Boolean - enables instanced rendering with `vertexAttribDivisor`
  - `buffer`: Custom WebGLBuffer (optional)

#### 🔗 interleave(name, layout, options?)

Define interleaved attribute layouts for efficient vertex data.

```typescript
const uniqueVertexData = Symbol('vertexData')
const uniquePosition = Symbol('position')

const vertexShader = glsl`
  ${interleave('vertexData', [
    // String key
    { key: 'position', kind: 'vec3' },
    { key: 'uv', kind: 'vec2' },
  ])}
  ${interleave(uniqueVertexData, [
    // Symbol key
    { key: uniquePosition, kind: 'vec3' },    // Symbol keys in layout
    { key: 'uv', kind: 'vec2' },
  ])}
  
  void main() {
    gl_Position = vec4(position + vec3(uv, 0.0), 1.0);
  }
`
```

**Parameters**:

- `name`: Buffer name (string or symbol for unique variables)
- `layout`: Array of attribute definitions
  - `key`: Attribute name (string or symbol for unique variables)
  - `kind`: GLSL type (see [Attribute Types](#-attribute-types))
- `options`: Optional configuration object
  - `instanced`: Boolean - applies `vertexAttribDivisor` to all attributes

### ⚙️ compile(gl, vertex, fragment, overrideSchema?)

Compiles shaders to a `WebGLProgram` and extracts typesafe schema and view.

### 🔄 compile.toQuad(gl, fragment, options?)

Convenient helper for fullscreen quad rendering with fragment shaders. Automatically creates a vertex shader with a quad geometry and handles vertex buffer setup.

```typescript
const { program, schema, view } = compile.toQuad(gl, fragmentShader)

// Ready to render - no vertex setup required
view.uniforms.time.set(performance.now())
gl.drawArrays(gl.TRIANGLES, 0, 6)
```

**Perfect for:**
- Fragment shader effects (ray-marching, post-processing, etc.)
- Fullscreen compute-style shaders
- Quick prototyping and experimentation

**Generated vertex shader:**
- Creates `a_quad` attribute automatically
- Outputs `uv` varying (same as vertex position: `[-1,1]` range)
- Sets up clip-space quad covering the entire screen

**Parameters:**
- `gl`: WebGL rendering context
- `fragment`: Fragment shader with embedded resources
- `options`: Optional compilation options (same as `compile()`)

**Returns:** Same as `compile()` with pre-configured quad rendering

```typescript
const { program, schema, view, vertex, fragment } = compile(gl, vertexShader, fragmentShader)

// Use the view directly
view.uniforms.time.set(performance.now())
view.attributes.position.set(vertexData).bind()

// Access the compiled shader strings
console.log(vertex)                           // Compiled vertex shader GLSL
console.log(fragment)                         // Compiled fragment shader GLSL

// Or access the extracted schema
console.log(schema.uniforms)                  // { time: { kind: 'float' }, ... }
console.log(schema.attributes)                // { position: { kind: 'vec3' }, ... }
```

**Override Schema:**

You can provide an optional override schema to enhance or override the automatically extracted schema:

```typescript
const { program, schema, view } = compile(gl, vertexShader, fragmentShader, {
  schema: {
    uniforms: {
      // Add additional uniforms not automatically inferred
      customTime: { kind: 'float' },
    },
  },
})

// The override schema is merged with the extracted schema
view.uniforms.customTime.set(123.45)

// An index buffer is its own thing — no program names it, and it outlives any
// one of them. Build it with bufferView and pass it into the vertex array.
const buffers = bufferView(gl, { indices: { target: 'ELEMENT_ARRAY_BUFFER' } })
buffers.indices.set(indexData)
const vao = view.vao([view.attributes.position, buffers.indices])
```

**Returns**:

- `program`: Compiled WebGL program
- `schema`: Merged schema (extracted + override)
- `view`: Ready-to-use view with type-safe resource access
- `vertex`: Compiled vertex shader GLSL string
- `fragment`: Compiled fragment shader GLSL string

#### 🔍 compile.toString(shader)

Converts a GLSL tagged template to a shader string without compilation of the `WebGLProgram`. Useful for debugging or when you need the raw shader code.

```typescript
const vertexShader = glsl`
  ${attribute.vec3('position')}
  ${uniform.mat4('mvpMatrix')}
  
  void main() {
    gl_Position = mvpMatrix * vec4(position, 1.0);
  }
`

const shaderString = compile.toString(vertexShader)
console.log(shaderString)
// Output:
// attribute vec3 position;
// uniform mat4 mvpMatrix;
// 
// void main() {
//   gl_Position = mvpMatrix * vec4(position, 1.0);
// }
```

**Features**:
- Converts resource tags to GLSL declarations
- Handles WebGL1/WebGL2 syntax automatically
- Resolves symbol variables to unique identifiers
- Processes nested GLSL fragments and arrays

#### 📋 compile.toSchema(shader)

Extracts the [`ViewSchema`](#viewschema) from a GLSL tagged template without compilation of the `WebGLProgram`. Returns the type-safe schema that could be used by [`view()`](#️-view).

```typescript
const shader = glsl`
  ${uniform.float('time')}
  ${uniform.vec3('lightPos', { size: 4 })}
  ${attribute.vec3('position')}
  ${interleave('vertexData', [
    attribute.vec2('uv'),
    attribute.vec4('color')
  ])}
`

const schema = compile.toSchema(shader)
console.log(schema)
// Output:
// {
//   uniforms: {
//     time: { kind: 'float' },
//     lightPos: { kind: 'vec3', size: 4 }
//   },
//   attributes: {
//     position: { kind: 'vec3' }
//   },
//   interleavedAttributes: {
//     vertexData: {
//       layout: [
//         { key: 'uv', kind: 'vec2' },
//         { key: 'color', kind: 'vec4' }
//       ],
//       instanced: false
//     }
//   }
// }
```

**Use Cases**:
- Analyze shader resources without GL context
- Generate TypeScript types from shaders
- Validate shader compatibility before compilation
- Build tooling around shader resources

<details>
<summary>Usage with vanilla view.gl</summary>

When manually constructing GLSL strings, use `toID()` to convert symbols to valid, unique identifiers:

```typescript
const u_time = Symbol('time')
const a_position = Symbol('position')

const vertex = `
  attribute vec3 ${toID(a_position)};
  uniform float ${toID(u_time)};

  void main() {
    gl_Position = vec4(${toID(a_position)}, ${toID(u_time)});
  }
`

const fragment = `
  precision mediump float;
  uniform float ${toID(u_time)};

  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, sin(${toID(u_time)}));
  }
`

const program = createProgram(gl, vertex, fragment)

const { attributes, uniforms } = view(gl, program, {
  uniforms: { [u_time]: { kind: 'float' } },
  attributes: { [a_position]: { kind: 'vec3' } },
})

attributes[a_position].set(vertexData)
uniforms[u_time].set(performance.now())
```

</details>

## 🛠️ Utils

### 🏗️ createProgram

Creates and links a WebGL program from vertex and fragment shader sources.

```typescript
const program = createProgram(gl, vertexShaderSource, fragmentShaderSource, { signal })
```

### 🖼️ createTexture

Creates a WebGL texture with specified parameters.

```typescript
const texture = createTexture(
  gl,
  {
    width: 512,
    height: 512,
    internalFormat: 'RGBA',
    format: 'RGBA',
    type: 'UNSIGNED_BYTE',
    minFilter: 'LINEAR',
    magFilter: 'LINEAR',
    wrapS: 'CLAMP_TO_EDGE',
    wrapT: 'CLAMP_TO_EDGE',
  },
  data,
  { signal },
)
```

Automatically validates WebGL2-only formats and provides fallbacks for WebGL1.

### 🖥️ createFramebuffer

Creates a framebuffer with attached texture for render-to-texture operations.

```typescript
const { framebuffer, texture, dispose } = createFramebuffer(
  gl,
  {
    width: 512,
    height: 512,
    attachment: 'color',
    internalFormat: 'RGBA',
    format: 'RGBA',
    type: 'UNSIGNED_BYTE',
  },
  { signal },
)
```

Supports color, depth, stencil, and combined depth-stencil attachments with completeness validation.

Pass a `texture` to attach one you already have — ping-ponging a pair of
framebuffers over shared textures, say. `dispose()` then deletes the framebuffer
and leaves that texture alone, because it is not the framebuffer's to delete.

## 🔍 WebGL Type Compatibility

### 🎯 Uniform Types

| Type                   | WebGL 1 | WebGL 2 |
| ---------------------- | ------- | ------- |
| `float`                | ✅      | ✅      |
| `int`                  | ✅      | ✅      |
| `bool`                 | ✅      | ✅      |
| `vec2`                 | ✅      | ✅      |
| `vec3`                 | ✅      | ✅      |
| `vec4`                 | ✅      | ✅      |
| `ivec2`                | ✅      | ✅      |
| `ivec3`                | ✅      | ✅      |
| `ivec4`                | ✅      | ✅      |
| `bvec2`                | ✅      | ✅      |
| `bvec3`                | ✅      | ✅      |
| `bvec4`                | ✅      | ✅      |
| `mat2`                 | ✅      | ✅      |
| `mat3`                 | ✅      | ✅      |
| `mat4`                 | ✅      | ✅      |
| `sampler2D`            | ✅      | ✅      |
| `samplerCube`          | ✅      | ✅      |
| `uint`                 | ❌      | ✅      |
| `uvec2`                | ❌      | ✅      |
| `uvec3`                | ❌      | ✅      |
| `uvec4`                | ❌      | ✅      |
| `mat2x3`               | ❌      | ✅      |
| `mat2x4`               | ❌      | ✅      |
| `mat3x2`               | ❌      | ✅      |
| `mat3x4`               | ❌      | ✅      |
| `mat4x2`               | ❌      | ✅      |
| `mat4x3`               | ❌      | ✅      |
| `sampler3D`            | ❌      | ✅      |
| `sampler2DArray`       | ❌      | ✅      |
| `sampler2DShadow`      | ❌      | ✅      |
| `samplerCubeShadow`    | ❌      | ✅      |
| `sampler2DArrayShadow` | ❌      | ✅      |
| `isampler2D`           | ❌      | ✅      |
| `isampler3D`           | ❌      | ✅      |
| `isamplerCube`         | ❌      | ✅      |
| `isampler2DArray`      | ❌      | ✅      |
| `usampler2D`           | ❌      | ✅      |
| `usampler3D`           | ❌      | ✅      |
| `usamplerCube`         | ❌      | ✅      |
| `usampler2DArray`      | ❌      | ✅      |

### 📝 Attribute Types

| Type     | WebGL 1 | WebGL 2 |
| -------- | ------- | ------- |
| `float`  | ✅      | ✅      |
| `vec2`   | ✅      | ✅      |
| `vec3`   | ✅      | ✅      |
| `vec4`   | ✅      | ✅      |
| `mat2`   | ✅      | ✅      |
| `mat3`   | ✅      | ✅      |
| `mat4`   | ✅      | ✅      |
| `int`    | ❌      | ✅      |
| `ivec2`  | ❌      | ✅      |
| `ivec3`  | ❌      | ✅      |
| `ivec4`  | ❌      | ✅      |
| `uint`   | ❌      | ✅      |
| `uvec2`  | ❌      | ✅      |
| `uvec3`  | ❌      | ✅      |
| `uvec4`  | ❌      | ✅      |
| `mat2x3` | ❌      | ✅      |
| `mat2x4` | ❌      | ✅      |
| `mat3x2` | ❌      | ✅      |
| `mat3x4` | ❌      | ✅      |
| `mat4x2` | ❌      | ✅      |
| `mat4x3` | ❌      | ✅      |
