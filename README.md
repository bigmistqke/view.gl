# 👁️ @bigmistqke/view.gl

🔧 Minimal library for managing WebGL uniforms / (interleaved) attributes / buffers / ...

- schema-based resource management [`view-gl`](#️-viewgl)
- type-safe GLSL template literals to compose schemas [`view-gl/tag`](#️-viewgltag)

## Table of Contents

- [📦 Install](#-install)
- [👁️ view.gl](#️-viewgl)
  - [🚀 Basic Usage](#-basic-usage)
  - [👀 View Types](#-view-types)
    - [🎯 uniformView](#-uniformview)
    - [📝 attributeView](#-attributeview)
    - [🔗 interleavedAttributeView](#-interleavedattributeview)
    - [🗂️ bufferView](#-bufferview)
  - [🎨 Drawing Examples](#-drawing-examples)
    - [🖼️ Regular Drawing](#-regular-drawing)
    - [📱 Instanced Drawing](#-instanced-drawing)
- [🏷️ view.gl/tag](#️-viewgltag)
  - [🚀 Basic Usage](#-basic-usage-1)
  - [📝 Template Features](#-template-features)
  - [⚙️ Tag Functions](#️-tag-functions)
    - [🎯 uniform[kind](name, options?)](#-uniformkindname-options)
    - [📝 attribute[kind](name, options?)](#-attributekindname-options)
    - [🔗 interleave(name, layout, options?)](#-interleavename-layout-options)
    - [📝 glsl](#-glsl)
    - [⚙️ compile(gl, vertex, fragment)](#️-compilegl-vertex-fragment)
  - [🔣 Symbol Support](#-symbol-support)
- [🛠️ Utils](#️-utils)
  - [🏗️ createProgram](#️-createprogram)
  - [🖼️ createTexture](#️-createtexture)
  - [🖥️ createFramebuffer](#️-createframebuffer)

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

The view system provides type-safe WebGL resource management for uniforms, attributes, and buffers.

### 🚀 Basic Usage

```typescript
import { view } from '@bigmistqke/view.gl'

const { uniforms, attributes } = view(gl, program, {
  uniforms: {
    time: { kind: 'float' },
    resolution: { kind: 'vec2' },
  },
  attributes: {
    position: { kind: 'vec3' },
    uv: { kind: 'vec2' },
  },
  buffers: {
    indices: { target: 'ELEMENT_ARRAY_BUFFER' },
  },
})

// Type-safe uniform setting
uniforms.time.set(performance.now())
uniforms.resolution.set(canvas.width, canvas.height)

// Attribute management
attributes.position.set(positionData)
attributes.position.bind()
```

### 👀 View Types

Each view type can be imported individually too.

```typescript
import {
  uniformView,
  attributeView,
  interleavedAttributeView,
  bufferView,
} from '@bigmistqke/view.gl'
```

#### 🎯 uniformView

Manages shader uniform variables.

```typescript
import { uniformView } from '@bigmistqke/view.gl'

const uniforms = uniformView(gl, program, {
  time: { kind: 'float' },
  lights: { kind: 'vec3', size: 8 }, // Array uniform: vec3[8]
  transform: { kind: 'mat4' },
})

uniforms.time.set(performance.now())
uniforms.lights.set(lightData) // Takes Float32Array for array uniforms
uniforms.transform.set(transformMatrix)
```

**Settings:**

- `kind`: GLSL type (`'float'`, `'vec2'`, `'mat4'`, `'sampler2D'`, etc.)
- `size`: Array size (optional) - converts uniform to array type with Float32Array setter

#### 📝 attributeView

Manages vertex attributes with buffer creation, binding, and data management.

```typescript
import { attributeView } from '@bigmistqke/view.gl'

const attributes = attributeView(gl, program, {
  position: { kind: 'vec3' },
  instanceOffset: { kind: 'vec2', instanced: true },
})

// Regular attribute for vertices
attributes.position.set(positionData).bind()

// Instanced attribute for per-instance data
attributes.instanceOffset.set(instanceData).bind()

// Draw regular geometry
gl.drawArrays(gl.TRIANGLES, 0, 3)

// Draw instanced geometry
gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100)
```

**Settings:**

- `kind`: GLSL type (`'float'`, `'vec2'`, `'vec3'`, `'vec4'`, `'mat2'`, `'mat3'`, `'mat4'`, integer types)
- `instanced`: Boolean - enables instanced rendering with `vertexAttribDivisor`
- `buffer`: Custom WebGLBuffer (optional) - uses auto-created buffer if not provided

#### 🔗 interleavedAttributeView

Manages interleaved vertex data with automatic stride/offset calculation and VAO optimization.

```typescript
import { interleavedAttributeView } from '@bigmistqke/view.gl'

const interleavedAttributes = interleavedAttributeView(gl, program, {
  vertexData: {
    layout: [
      { key: 'position', kind: 'vec3' },
      { key: 'normal', kind: 'vec3' },
      { key: 'uv', kind: 'vec2' },
    ],
  },
  instanceData: {
    layout: [
      { key: 'instancePos', kind: 'vec2' },
      { key: 'instanceColor', kind: 'vec3' },
    ],
    instanced: true,
  },
})

// Upload interleaved data
interleavedAttributes.vertexData.set(interleavedVertexData)
interleavedAttributes.instanceData.set(interleavedInstanceData)

// Bind all attributes in layout
interleavedAttributes.vertexData.bind()
interleavedAttributes.instanceData.bind()
```

**Settings:**

- `layout`: Array of attribute definitions with `name` and `kind`
- `instanced`: Boolean - applies `vertexAttribDivisor` to all attributes in layout

#### 🗂️ bufferView

Manages generic WebGL buffers for various uses.

```typescript
import { bufferView } from '@bigmistqke/view.gl'

const buffers = bufferView(gl, {
  indices: { target: 'ELEMENT_ARRAY_BUFFER' },
  data: { target: 'ARRAY_BUFFER', usage: 'DYNAMIC_DRAW' },
})

buffers.indices.set(indexData)
buffers.indices.bind()

buffers.data.set(dynamicData)
buffers.data.bind()
```

**Settings:**

- `target`: Buffer target (`'ARRAY_BUFFER'`, `'ELEMENT_ARRAY_BUFFER'`)
- `usage`: Usage pattern (`'STATIC_DRAW'`, `'DYNAMIC_DRAW'`, `'STREAM_DRAW'`)

### 🎨 Drawing Examples

#### 🖼️ Regular Drawing

```typescript
const { attributes } = view(gl, program, {
  attributes: {
    position: { kind: 'vec3' },
    uv: { kind: 'vec2' },
  },
})

attributes.position.set(vertices).bind()
attributes.uv.set(uvData).bind()

gl.drawArrays(gl.TRIANGLES, 0, vertexCount)
```

#### 📱 Instanced Drawing

```typescript
const { attributes } = view(gl, program, {
  attributes: {
    position: { kind: 'vec3' },
    instanceOffset: { kind: 'vec2', instanced: true },
    instanceColor: { kind: 'vec3', instanced: true },
  },
})

attributes.position.set(triangleVertices).bind()
attributes.instanceOffset.set(instanceOffsets).bind()
attributes.instanceColor.set(instanceColors).bind()

gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, instanceCount)
```

## 🏷️ view.gl/tag

The tag system provides GLSL template literal support with embedded schema definitions.

### 🚀 Basic Usage

```typescript
import { glsl, uniform, attribute, compile } from '@bigmistqke/view.gl/tag'

const vertexShader = glsl`
  ${attribute.vec3('position')}
  ${attribute.vec2('uv')}
  ${uniform.mat4('projection')}
  ${uniform.mat4('model')}
  
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projection * model * vec4(position, 1.0);
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

### 📝 Template Features

- **Embedded Resources**: Define uniforms and attributes directly in GLSL
- **Type Safety**: Automatic schema generation from template literals
- **WebGL Version Support**: Automatic syntax conversion for WebGL1/2
- **Interleaved Attributes**: Multi-attribute layout support
- **Symbol Support**: Use JavaScript symbols as keys (see [Symbol Support](#-symbol-support))

### ⚙️ Tag Functions

#### 🎯 uniform[kind](name, options?)

Define uniform variables in GLSL templates. Supports all GLSL uniform types.

```typescript
import { uniform, glsl } from '@bigmistqke/view.gl/tag'

const shader = glsl`
  ${uniform.float('time')}
  ${uniform.vec2('resolution')}
  ${uniform.mat4('projection')}
  ${uniform.sampler2D('texture')}
  ${uniform.vec3('lights', { size: 8 })} // Array uniform: vec3[8]
  
  void main() {
    // Use uniforms in shader code
  }
`
```

**Available types**: `float`, `int`, `bool`, `vec2`, `vec3`, `vec4`, `ivec2`, `ivec3`, `ivec4`, `bvec2`, `bvec3`, `bvec4`, `mat2`, `mat3`, `mat4`, `sampler2D`, `samplerCube`

**Options**:

- `size`: Array size (creates array uniform with Float32Array setter)

#### 📝 attribute[kind](name, options?)

Define vertex attributes in GLSL templates.

```typescript
import { attribute, glsl } from '@bigmistqke/view.gl/tag'

const vertexShader = glsl`
  ${attribute.vec3('position')}
  ${attribute.vec2('uv')}
  ${attribute.vec3('normal')}
  ${attribute.vec2('instanceOffset', { instanced: true })}
  
  void main() {
    gl_Position = vec4(position + vec3(instanceOffset, 0.0), 1.0);
  }
`
```

**Available types**: `float`, `vec2`, `vec3`, `vec4`, `mat2`, `mat3`, `mat4`, `int`, `ivec2`, `ivec3`, `ivec4`

**Options**:

- `instanced`: Boolean - enables instanced rendering with `vertexAttribDivisor`
- `buffer`: Custom WebGLBuffer (optional)

#### 🔗 interleave(name, layout, options?)

Define interleaved attribute layouts for efficient vertex data.

```typescript
import { interleave, glsl } from '@bigmistqke/view.gl/tag'

const vertexShader = glsl`
  ${interleave('vertexData', [
    { key: 'position', kind: 'vec3' },
    { key: 'normal', kind: 'vec3' },
    { key: 'uv', kind: 'vec2' },
  ])}
  
  ${interleave(
    'instanceData',
    [
      { key: 'instancePos', kind: 'vec2' },
      { key: 'instanceColor', kind: 'vec3' },
    ],
    { instanced: true },
  )}
  
  void main() {
    gl_Position = vec4(position + vec3(instancePos, 0.0), 1.0);
  }
`
```

**Layout format**:

- `key`: Attribute name
- `kind`: GLSL type

**Options**:

- `instanced`: Boolean - applies `vertexAttribDivisor` to all attributes

#### 📝 glsl

Template literal processor that handles GLSL code and embedded resources.

```typescript
import { glsl } from '@bigmistqke/view.gl/tag'

const shader = glsl`
  precision mediump float;
  
  ${uniform.vec2('resolution')}
  
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    gl_FragColor = vec4(uv, 0.0, 1.0);
  }
`
```

#### ⚙️ compile(gl, vertex, fragment)

Compiles shaders and extracts schema from embedded resources.

```typescript
import { compile } from '@bigmistqke/view.gl/tag'

const { program, schema } = compile(gl, vertexShader, fragmentShader)

// Schema contains extracted uniforms, attributes, and buffers
console.log(schema.uniforms) // { time: { kind: 'float' }, ... }
console.log(schema.attributes) // { position: { kind: 'vec3' }, ... }
```

**Returns**:

- `program`: Compiled WebGL program
- `schema`: Extracted resource definitions for use with `view()`

### 🔣 Symbol Support

Symbols are supported as keys for uniforms, attributes, and buffers. When interpolated in glsl templates, they're automatically converted to valid GLSL identifiers. This prevents naming collisions between different shader modules and enables private scoping of shader variables.

```typescript
const u_time = Symbol('time')
const a_position = Symbol('position')

const shader = glsl`
  ${attribute.vec3(a_position)}
  ${uniform.float(u_time)}
  
  void main() {
    gl_Position = vec4(${a_position}, ${u_time});
  }
`
```

<details>
<summary>Usage with vanilla view.gl</summary>

When manually constructing GLSL strings, use `toID()` to convert symbols to valid identifiers:

```typescript
import { createProgram, view, toID } from 'view.gl'

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
import { createProgram } from '@bigmistqke/view.gl/utils'

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
```

### 🖼️ createTexture

Creates a WebGL texture with specified parameters.

```typescript
import { createTexture } from '@bigmistqke/view.gl/utils'

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
)
```

Automatically validates WebGL2-only formats and provides fallbacks for WebGL1.

### 🖥️ createFramebuffer

Creates a framebuffer with attached texture for render-to-texture operations.

```typescript
import { createFramebuffer } from '@bigmistqke/view.gl/utils'

const { framebuffer, texture } = createFramebuffer(gl, {
  width: 512,
  height: 512,
  attachment: 'color',
  internalFormat: 'RGBA',
  format: 'RGBA',
  type: 'UNSIGNED_BYTE',
})
```

Supports color, depth, stencil, and combined depth-stencil attachments with completeness validation.
