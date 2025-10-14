# view.gl

Minimal library for WebGL shader resource management with type-safe GLSL template literals.

## Table of Contents

- [View](#view)
  - [Basic Usage](#basic-usage)
  - [View Types](#view-types)
    - [uniformView](#uniformview)
    - [attributeView](#attributeview)
    - [interleavedAttributeView](#interleavedattributeview)
    - [bufferView](#bufferview)
  - [Drawing Examples](#drawing-examples)
    - [Regular Drawing](#regular-drawing)
    - [Instanced Drawing](#instanced-drawing)
- [Tag](#tag)
  - [Basic Usage](#basic-usage-1)
  - [Template Features](#template-features)
  - [Tag Functions](#tag-functions)
  - [Symbol Support in Templates](#symbol-support)
  - [Supported Types](#supported-types)
- [Utils](#utils)
  - [WebGL Utilities](#webgl-utilities)
  - [Type Utilities](#type-utilities)
  - [Type Guards](#type-guards)
  - [Resource Creation](#resource-creation)

## View

The view system provides type-safe WebGL resource management for uniforms, attributes, and buffers.

### Basic Usage

```typescript
import { view } from '@bigmistqke/view.gl'

const resources = view(gl, program, {
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
resources.uniforms.time.set(performance.now())
resources.uniforms.resolution.set(canvas.width, canvas.height)

// Attribute management
resources.attributes.position.set(positionData)
resources.attributes.position.bind()
```

### View Types

Each view type can be imported individually too.

```typescript
import {
  uniformView,
  attributeView,
  interleavedAttributeView,
  bufferView,
} from '@bigmistqke/view.gl'
```

#### uniformView

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

#### attributeView

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

#### interleavedAttributeView

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

#### bufferView

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

### Drawing Examples

#### Regular Drawing

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

#### Instanced Drawing

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

### Features

- **Automatic Resource Management**: Buffer creation, disposal, and cleanup
- **Type Safety**: Compile-time type checking for uniform and attribute operations
- **WebGL Extensions**: Automatic fallback for instanced arrays and vertex array objects
- **Memory Management**: AbortSignal support for resource cleanup

## Tag

The tag system provides GLSL template literal support with embedded resource definitions.

### Template Features

- **Embedded Resources**: Define uniforms and attributes directly in GLSL
- **Type Safety**: Automatic schema generation from template literals
- **WebGL Version Support**: Automatic syntax conversion for WebGL1/2
- **Interleaved Attributes**: Multi-attribute layout support
- **Symbol Support**: Use JavaScript symbols as keys (see [View Features](#symbol-support))

### Tag Functions

- `uniform[kind](name, options?)`: Define uniform variables
- `attribute[kind](name, options?)`: Define vertex attributes
- `interleave(name, layout, options?)`: Define interleaved attribute layouts
- `glsl`: Template literal processor for GLSL code
- `compile(gl, vertex, fragment)`: Compile shaders and extract schema

### Basic Usage

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

### Symbol Support

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

## Utils

WebGL utilities and helper functions.

### WebGL Utilities

#### createProgram

Creates and links a WebGL program from vertex and fragment shader sources.

```typescript
import { createProgram } from '@bigmistqke/view.gl/utils'

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
```

#### createTexture

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

#### createFramebuffer

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
