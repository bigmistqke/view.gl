import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attributeView,
  bufferView,
  interleavedAttributeView,
  uniformView,
  view,
} from '../src/index'
import type {
  AttributeSchema,
  BufferSchema,
  InterleavedAttributeSchema,
  UniformSchema,
  ViewSchema,
} from '../src/types'
import { createMockCanvas, createMockGL } from './mocks/webgl'

describe('view', () => {
  let gl: WebGL2RenderingContext
  let program: WebGLProgram
  beforeEach(() => {
    const mock = createMockCanvas()
    gl = mock.gl
    program = gl.createProgram()!
  })

  it('should create a view with uniforms', () => {
    const schema = {
      uniforms: {
        u_resolution: { kind: 'vec2' },
        u_time: { kind: 'float' },
        u_texture: { kind: 'sampler2D' },
      },
    } satisfies ViewSchema

    const result = view(gl, program, schema)

    expect(result.uniforms).toBeDefined()
    expect(result.uniforms!.u_resolution).toBeDefined()
    expect(result.uniforms!.u_resolution.set).toBeInstanceOf(Function)
    expect(result.uniforms!.u_time).toBeDefined()
    expect(result.uniforms!.u_time.set).toBeInstanceOf(Function)
    expect(result.uniforms!.u_texture).toBeDefined()
    expect(result.uniforms!.u_texture.set).toBeInstanceOf(Function)
    expect(result.attributes).toBeUndefined()
    expect(result.interleavedAttributes).toBeUndefined()
    expect(result.buffers).toBeUndefined()
  })

  it('should create a view with attributes', () => {
    const schema = {
      attributes: {
        a_position: { kind: 'vec2' },
        a_color: { kind: 'vec4', instanced: true },
      },
    } satisfies ViewSchema

    const result = view(gl, program, schema)

    expect(result.attributes).toBeDefined()
    expect(result.attributes!.a_position).toBeDefined()
    expect(result.attributes!.a_position.buffer).toBeDefined()
    expect(result.attributes!.a_position.bind).toBeInstanceOf(Function)
    expect(result.attributes!.a_position.dispose).toBeInstanceOf(Function)
    expect(result.attributes!.a_position.set).toBeInstanceOf(Function)
    expect(result.uniforms).toBeUndefined()
  })

  it('should create a view with interleaved attributes', () => {
    const schema = {
      interleavedAttributes: {
        data: {
          layout: [
            { name: 'a_position', kind: 'vec2' },
            { name: 'a_color', kind: 'vec4' },
          ],
          instanced: false,
        },
      },
    } satisfies ViewSchema

    const result = view(gl, program, schema)

    expect(result.interleavedAttributes).toBeDefined()
    expect(result.interleavedAttributes!.data).toBeDefined()
    expect(result.interleavedAttributes!.data.bind).toBeInstanceOf(Function)
    expect(result.interleavedAttributes!.data.unbind).toBeInstanceOf(Function)
    expect(result.interleavedAttributes!.data.dispose).toBeInstanceOf(Function)
    expect(result.interleavedAttributes!.data.set).toBeInstanceOf(Function)
  })

  it('should create a view with buffers', () => {
    const schema = {
      buffers: {
        vertices: { target: 'ARRAY_BUFFER', usage: 'STATIC_DRAW' },
        indices: { target: 'ELEMENT_ARRAY_BUFFER', usage: 'DYNAMIC_DRAW' },
      },
    } satisfies ViewSchema

    const result = view(gl, program, schema)

    expect(result.buffers).toBeDefined()
    expect(result.buffers!.vertices).toBeDefined()
    expect(result.buffers!.vertices.bind).toBeInstanceOf(Function)
    expect(result.buffers!.vertices.dispose).toBeInstanceOf(Function)
    expect(result.buffers!.vertices.set).toBeInstanceOf(Function)
  })

  it('should create a view with all components', () => {
    const schema = {
      uniforms: {
        u_time: { kind: 'float' },
      },
      attributes: {
        a_position: { kind: 'vec2' },
      },
      interleavedAttributes: {
        data: {
          layout: [{ name: 'a_uv', kind: 'vec2' }],
          instanced: false,
        },
      },
      buffers: {
        vertices: {},
      },
    } satisfies ViewSchema

    const result = view(gl, program, schema)

    expect(result.uniforms).toBeDefined()
    expect(result.attributes).toBeDefined()
    expect(result.interleavedAttributes).toBeDefined()
    expect(result.buffers).toBeDefined()
  })
})

describe('uniformView', () => {
  let gl: ReturnType<typeof createMockGL>
  let program: WebGLProgram

  beforeEach(() => {
    gl = createMockGL()
    program = gl.createProgram()!
  })

  it('should create uniform setters for basic types', () => {
    const schema = {
      u_float: { kind: 'float' },
      u_vec2: { kind: 'vec2' },
      u_vec3: { kind: 'vec3' },
      u_vec4: { kind: 'vec4' },
    } satisfies UniformSchema

    const uniforms = uniformView(gl, program, schema)

    // Test float uniform
    uniforms.u_float.set(1.5)
    expect(gl.uniform1f).toHaveBeenCalledWith(expect.any(Object), 1.5)

    // Test vec2 uniform
    uniforms.u_vec2.set(2.0, 3.0)
    expect(gl.uniform2f).toHaveBeenCalledWith(expect.any(Object), 2.0, 3.0)

    // Test vec3 uniform
    uniforms.u_vec3.set(1.0, 2.0, 3.0)
    expect(gl.uniform3f).toHaveBeenCalledWith(expect.any(Object), 1.0, 2.0, 3.0)

    // Test vec4 uniform
    uniforms.u_vec4.set(1.0, 2.0, 3.0, 4.0)
    expect(gl.uniform4f).toHaveBeenCalledWith(expect.any(Object), 1.0, 2.0, 3.0, 4.0)
  })

  it('should create uniform setters for array types', () => {
    const schema = {
      u_floatArray: { kind: 'float', size: 5 },
      u_vec3Array: { kind: 'vec3', size: 3 },
    } satisfies UniformSchema

    const uniforms = uniformView(gl, program, schema)

    // Test float array
    const floatArray = new Float32Array([1, 2, 3, 4, 5])
    uniforms.u_floatArray.set(floatArray)
    expect(gl.uniform1fv).toHaveBeenCalledWith(expect.any(Object), floatArray)

    // Test vec3 array
    const vec3Array = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    uniforms.u_vec3Array.set(vec3Array)
    expect(gl.uniform3fv).toHaveBeenCalledWith(expect.any(Object), vec3Array)
  })

  it('should create uniform setters for matrix types', () => {
    const schema = {
      u_mat2: { kind: 'mat2' },
      u_mat3: { kind: 'mat3' },
      u_mat4: { kind: 'mat4' },
    } satisfies UniformSchema

    const uniforms = uniformView(gl, program, schema)

    // Test mat2
    const mat2 = new Float32Array([1, 2, 3, 4])
    uniforms.u_mat2.set(mat2)
    expect(gl.uniformMatrix2fv).toHaveBeenCalledWith(expect.any(Object), false, mat2)

    // Test mat3
    const mat3 = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    uniforms.u_mat3.set(mat3)
    expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(expect.any(Object), false, mat3)

    // Test mat4
    const mat4 = new Float32Array(16)
    uniforms.u_mat4.set(mat4)
    expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(expect.any(Object), false, mat4)
  })

  it('should create uniform setters for sampler types', () => {
    const schema = {
      u_texture: { kind: 'sampler2D' },
      u_cubeMap: { kind: 'samplerCube' },
    } satisfies UniformSchema

    const uniforms = uniformView(gl, program, schema)

    // Test sampler2D
    uniforms.u_texture.set(0)
    expect(gl.uniform1i).toHaveBeenCalledWith(expect.any(Object), 0)

    // Test samplerCube
    uniforms.u_cubeMap.set(1)
    expect(gl.uniform1i).toHaveBeenCalledWith(expect.any(Object), 1)
  })

  it('should create uniform setters for integer types', () => {
    const schema = {
      u_int: { kind: 'int' },
      u_ivec2: { kind: 'ivec2' },
      u_ivec3: { kind: 'ivec3' },
      u_ivec4: { kind: 'ivec4' },
    } satisfies UniformSchema

    const uniforms = uniformView(gl, program, schema)

    // Test int uniform
    uniforms.u_int.set(42)
    expect(gl.uniform1i).toHaveBeenCalledWith(expect.any(Object), 42)

    // Test ivec2 uniform
    uniforms.u_ivec2.set(1, 2)
    expect(gl.uniform2i).toHaveBeenCalledWith(expect.any(Object), 1, 2)

    // Test ivec3 uniform
    uniforms.u_ivec3.set(1, 2, 3)
    expect(gl.uniform3i).toHaveBeenCalledWith(expect.any(Object), 1, 2, 3)

    // Test ivec4 uniform
    uniforms.u_ivec4.set(1, 2, 3, 4)
    expect(gl.uniform4i).toHaveBeenCalledWith(expect.any(Object), 1, 2, 3, 4)
  })
})

describe('attributeView', () => {
  let gl: ReturnType<typeof createMockGL>
  let program: WebGLProgram

  beforeEach(() => {
    gl = createMockGL()
    program = gl.createProgram()!
  })

  it('should create attribute methods for basic types', () => {
    const schema = {
      a_position: { kind: 'vec2' },
      a_color: { kind: 'vec4' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    expect(attributes.a_position).toBeDefined()
    expect(attributes.a_position.buffer).toBeDefined()
    expect(gl.createBuffer).toHaveBeenCalled()

    // Test bind
    attributes.a_position.bind()
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, attributes.a_position.buffer)
    expect(gl.enableVertexAttribArray).toHaveBeenCalled()
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      expect.any(Number), // location
      2, // size for vec2
      gl.FLOAT,
      false,
      0, // stride
      0, // offset
    )
  })

  it('should handle instanced attributes', () => {
    const schema = {
      a_instancePosition: { kind: 'vec3', instanced: true },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    attributes.a_instancePosition.bind()
    expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(expect.any(Number), 1)
  })

  it('should use custom buffer if provided', () => {
    const customBuffer = gl.createBuffer()!
    const schema = {
      a_position: { kind: 'vec2', buffer: customBuffer },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    expect(attributes.a_position.buffer).toBe(customBuffer)
    // Should not create a new buffer
    expect(gl.createBuffer).toHaveBeenCalledTimes(1) // Only for the custom buffer
  })

  it('should handle float attributes', () => {
    const schema = {
      a_scalar: { kind: 'float' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    attributes.a_scalar.bind()
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      expect.any(Number),
      1, // size for float
      gl.FLOAT,
      false,
      0,
      0,
    )
  })

  it('should handle integer attributes', () => {
    const schema = {
      a_index: { kind: 'int' },
      a_indices: { kind: 'ivec2' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    attributes.a_index.bind()
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      expect.any(Number),
      1, // size for int
      gl.INT,
      false,
      0,
      0,
    )

    attributes.a_indices.bind()
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      expect.any(Number),
      2, // size for ivec2
      gl.INT,
      false,
      0,
      0,
    )
  })

  it('should set buffer data', () => {
    const schema = {
      a_position: { kind: 'vec2' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)
    const data = new Float32Array([1, 2, 3, 4, 5, 6])

    const result = attributes.a_position.set(data)
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, attributes.a_position.buffer)
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    expect(result).toBe(attributes.a_position) // Should return this for chaining
  })

  it('should set buffer data with custom usage', () => {
    const schema = {
      a_position: { kind: 'vec2' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)
    const data = new Float32Array([1, 2, 3, 4])

    attributes.a_position.set(data, 'DYNAMIC_DRAW')
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
  })

  it('should dispose buffers', () => {
    const schema = {
      a_position: { kind: 'vec2' },
      a_color: { kind: 'vec4' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema)

    attributes.a_position.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledWith(attributes.a_position.buffer)

    attributes.a_color.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledWith(attributes.a_color.buffer)
  })

  it('should dispose all buffers on abort signal', () => {
    const controller = new AbortController()
    const schema = {
      a_position: { kind: 'vec2' },
      a_color: { kind: 'vec4' },
    } satisfies AttributeSchema

    const attributes = attributeView(gl, program, schema, { signal: controller.signal })

    controller.abort()

    expect(gl.deleteBuffer).toHaveBeenCalledWith(attributes.a_position.buffer)
    expect(gl.deleteBuffer).toHaveBeenCalledWith(attributes.a_color.buffer)
  })

  it('should throw error if attribute not found in program', () => {
    gl.getAttribLocation = vi.fn(() => -1)

    const schema = {
      a_notFound: { kind: 'vec2' },
    } satisfies AttributeSchema

    expect(() => attributeView(gl, program, schema)).toThrow("Attribute 'a_notFound' not found")
  })
})

describe('interleavedAttributeView', () => {
  let gl: ReturnType<typeof createMockGL>
  let program: WebGLProgram

  beforeEach(() => {
    gl = createMockGL()
    program = gl.createProgram()!
  })

  it('should create interleaved attribute methods', () => {
    const schema = {
      vertexData: {
        layout: [
          { name: 'a_position', kind: 'vec2' },
          { name: 'a_color', kind: 'vec4' },
        ],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)

    expect(interleavedAttributes.vertexData).toBeDefined()
    expect(interleavedAttributes.vertexData.bind).toBeInstanceOf(Function)
    expect(interleavedAttributes.vertexData.unbind).toBeInstanceOf(Function)
    expect(interleavedAttributes.vertexData.dispose).toBeInstanceOf(Function)
    expect(interleavedAttributes.vertexData.set).toBeInstanceOf(Function)
  })

  it('should calculate correct stride and offsets', () => {
    const schema = {
      vertexData: {
        layout: [
          { name: 'a_position', kind: 'vec3' }, // 3 * 4 = 12 bytes
          { name: 'a_normal', kind: 'vec3' }, // 3 * 4 = 12 bytes
          { name: 'a_uv', kind: 'vec2' }, // 2 * 4 = 8 bytes
        ], // Total stride = 32 bytes
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)

    interleavedAttributes.vertexData.bind()

    // Check vertexAttribPointer calls
    const calls = (gl.vertexAttribPointer as any).mock.calls

    // First attribute (position)
    expect(calls[0][1]).toBe(3) // size
    expect(calls[0][3]).toBe(false) // normalized
    expect(calls[0][4]).toBe(32) // stride
    expect(calls[0][5]).toBe(0) // offset

    // Second attribute (normal)
    expect(calls[1][1]).toBe(3) // size
    expect(calls[1][3]).toBe(false) // normalized
    expect(calls[1][4]).toBe(32) // stride
    expect(calls[1][5]).toBe(12) // offset

    // Third attribute (uv)
    expect(calls[2][1]).toBe(2) // size
    expect(calls[2][3]).toBe(false) // normalized
    expect(calls[2][4]).toBe(32) // stride
    expect(calls[2][5]).toBe(24) // offset
  })

  it('should handle instanced interleaved attributes', () => {
    const schema = {
      instanceData: {
        layout: [
          { name: 'a_instancePos', kind: 'vec3' },
          { name: 'a_instanceScale', kind: 'float' },
        ],
        instanced: true,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)

    interleavedAttributes.instanceData.bind()

    expect(gl.vertexAttribDivisor).toHaveBeenCalledTimes(2)
    expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(expect.any(Number), 1)
  })

  it('should handle integer attributes in layout', () => {
    const schema = {
      data: {
        layout: [
          { name: 'a_position', kind: 'vec2' },
          { name: 'a_index', kind: 'int' },
          { name: 'a_flags', kind: 'ivec2' },
        ],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)

    interleavedAttributes.data.bind()

    const calls = (gl.vertexAttribPointer as any).mock.calls

    // Check that integer attributes use INT type
    expect(calls[0][2]).toBe(gl.FLOAT) // vec2
    expect(calls[1][2]).toBe(gl.INT) // int
    expect(calls[2][2]).toBe(gl.INT) // ivec2
  })

  it('should set buffer data', () => {
    const schema = {
      vertexData: {
        layout: [
          { name: 'a_position', kind: 'vec2' },
          { name: 'a_color', kind: 'vec4' },
        ],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)
    const data = new Float32Array([
      // vertex 0
      1,
      2, // position
      1,
      0,
      0,
      1, // color
      // vertex 1
      3,
      4, // position
      0,
      1,
      0,
      1, // color
    ])

    interleavedAttributes.vertexData.set(data)
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  })

  it('should use VAO when available', () => {
    const vertexArray = { id: 1 }
    const vaoExt = {
      createVertexArrayOES: vi.fn(() => vertexArray),
      bindVertexArrayOES: vi.fn(),
      deleteVertexArrayOES: vi.fn(),
    }

    // Override the getExtension method for this test
    const originalGetExtension = gl.getExtension
    gl.getExtension = vi.fn((name: string) => {
      if (name === 'OES_vertex_array_object') return vaoExt as any
      return originalGetExtension.call(gl, name)
    }) as any

    const schema = {
      vertexData: {
        layout: [{ name: 'a_position', kind: 'vec2' }],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl as any, program, schema)

    expect(vaoExt.createVertexArrayOES).toHaveBeenCalled()
    expect(vaoExt.bindVertexArrayOES).toHaveBeenCalledWith(vertexArray)
    expect(vaoExt.bindVertexArrayOES).toHaveBeenCalledWith(null) // unbind after setup

    // Test bind
    interleavedAttributes.vertexData.bind()
    expect(vaoExt.bindVertexArrayOES).toHaveBeenCalledWith(vertexArray)

    // Test unbind
    interleavedAttributes.vertexData.unbind()
    expect(vaoExt.bindVertexArrayOES).toHaveBeenCalledWith(null)

    // Test dispose
    interleavedAttributes.vertexData.dispose()
    expect(vaoExt.deleteVertexArrayOES).toHaveBeenCalledWith(vertexArray)

    // Restore original method
    gl.getExtension = originalGetExtension
  })

  it('should dispose buffers', () => {
    const schema = {
      data1: {
        layout: [{ name: 'a_pos', kind: 'vec2' }],
        instanced: false,
      },
      data2: {
        layout: [{ name: 'a_color', kind: 'vec4' }],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    const interleavedAttributes = interleavedAttributeView(gl, program, schema)

    interleavedAttributes.data1.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1)

    interleavedAttributes.data2.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  it('should dispose all resources on abort signal', () => {
    const controller = new AbortController()
    const schema = {
      data1: {
        layout: [{ name: 'a_position', kind: 'vec2' }],
        instanced: false,
      },
      data2: {
        layout: [{ name: 'a_color', kind: 'vec4' }],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    interleavedAttributeView(gl, program, schema, {
      signal: controller.signal,
    })

    controller.abort()

    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  it('should throw error if attribute not found in program', () => {
    gl.getAttribLocation = vi.fn(() => -1)

    const schema = {
      data: {
        layout: [{ name: 'a_notFound', kind: 'vec2' }],
        instanced: false,
      },
    } satisfies InterleavedAttributeSchema

    expect(() => interleavedAttributeView(gl, program, schema)).toThrow(
      "Attribute 'a_notFound' not found",
    )
  })
})

describe('bufferView', () => {
  let gl: ReturnType<typeof createMockGL>

  beforeEach(() => {
    gl = createMockGL()
  })

  it('should create buffer methods with default options', () => {
    const schema = {
      vertices: {},
      indices: {},
    } satisfies BufferSchema

    const buffers = bufferView(gl, schema)

    expect(buffers.vertices).toBeDefined()
    expect(buffers.vertices.bind).toBeInstanceOf(Function)
    expect(buffers.vertices.dispose).toBeInstanceOf(Function)
    expect(buffers.vertices.set).toBeInstanceOf(Function)
    expect(gl.createBuffer).toHaveBeenCalledTimes(2)
  })

  it('should create buffers with specified target', () => {
    const schema = {
      vertices: { target: 'ARRAY_BUFFER' },
      indices: { target: 'ELEMENT_ARRAY_BUFFER' },
    } satisfies BufferSchema

    const buffers = bufferView(gl, schema)

    buffers.vertices.bind()
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Object))

    buffers.indices.bind()
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, expect.any(Object))
  })

  it('should set buffer data with specified usage', () => {
    const schema = {
      vertices: { target: 'ARRAY_BUFFER', usage: 'STATIC_DRAW' },
      dynamic: { target: 'ARRAY_BUFFER', usage: 'DYNAMIC_DRAW' },
    } satisfies BufferSchema

    const buffers = bufferView(gl, schema)
    const data = new Float32Array([1, 2, 3, 4])

    buffers.vertices.set(data)
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

    buffers.dynamic.set(data)
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
  })

  it('should dispose buffers', () => {
    const schema = {
      buffer1: {},
      buffer2: {},
    } satisfies BufferSchema

    const buffers = bufferView(gl, schema)

    buffers.buffer1.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1)

    buffers.buffer2.dispose()
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2)
  })

  it('should dispose all buffers on abort signal', () => {
    const controller = new AbortController()
    const schema = {
      buffer1: {},
      buffer2: {},
      buffer3: {},
    } satisfies BufferSchema

    bufferView(gl, schema, { signal: controller.signal })

    controller.abort()

    expect(gl.deleteBuffer).toHaveBeenCalledTimes(3)
  })
})
