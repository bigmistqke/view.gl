import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attribute, compile, glsl, interleave, uniform } from '../src/tag'
import type { GL } from '../src/types'
import { createMockGL } from './mocks/webgl'

describe('uniform', () => {
  it('should create uniform tags for basic types', () => {
    expect(uniform.float('u_time')).toEqual({
      type: 'uniform',
      key: 'u_time',
      kind: 'float',
    })

    expect(uniform.vec2('u_resolution')).toEqual({
      type: 'uniform',
      key: 'u_resolution',
      kind: 'vec2',
    })

    expect(uniform.vec3('u_position')).toEqual({
      type: 'uniform',
      key: 'u_position',
      kind: 'vec3',
    })

    expect(uniform.vec4('u_color')).toEqual({
      type: 'uniform',
      key: 'u_color',
      kind: 'vec4',
    })
  })

  it('should create uniform tags for integer types', () => {
    expect(uniform.int('u_count')).toEqual({
      type: 'uniform',
      key: 'u_count',
      kind: 'int',
    })

    expect(uniform.ivec2('u_indices')).toEqual({
      type: 'uniform',
      key: 'u_indices',
      kind: 'ivec2',
    })
  })

  it('should create uniform tags for matrix types', () => {
    expect(uniform.mat2('u_mat2')).toEqual({
      type: 'uniform',
      key: 'u_mat2',
      kind: 'mat2',
    })

    expect(uniform.mat3('u_mat3')).toEqual({
      type: 'uniform',
      key: 'u_mat3',
      kind: 'mat3',
    })

    expect(uniform.mat4('u_modelMatrix')).toEqual({
      type: 'uniform',
      key: 'u_modelMatrix',
      kind: 'mat4',
    })
  })

  it('should create uniform tags for sampler types', () => {
    expect(uniform.sampler2D('u_texture')).toEqual({
      type: 'uniform',
      key: 'u_texture',
      kind: 'sampler2D',
    })

    expect(uniform.samplerCube('u_envMap')).toEqual({
      type: 'uniform',
      key: 'u_envMap',
      kind: 'samplerCube',
    })
  })

  it('should create uniform tags with size option for arrays', () => {
    expect(uniform.float('u_values', { size: 10 })).toEqual({
      type: 'uniform',
      key: 'u_values',
      kind: 'float',
      size: 10,
    })

    expect(uniform.vec3('u_palette', { size: 5 })).toEqual({
      type: 'uniform',
      key: 'u_palette',
      kind: 'vec3',
      size: 5,
    })
  })

  it('should handle symbol properties correctly', () => {
    const symbolKey = Symbol('test')
    // @ts-expect-error Testing symbol access
    expect(uniform[symbolKey]).toBeUndefined()
  })
})

describe('attribute', () => {
  it('should create attribute tags for basic types', () => {
    expect(attribute.float('a_t')).toEqual({
      type: 'attribute',
      key: 'a_t',
      kind: 'float',
    })

    expect(attribute.vec2('a_position')).toEqual({
      type: 'attribute',
      key: 'a_position',
      kind: 'vec2',
    })

    expect(attribute.vec3('a_normal')).toEqual({
      type: 'attribute',
      key: 'a_normal',
      kind: 'vec3',
    })

    expect(attribute.vec4('a_color')).toEqual({
      type: 'attribute',
      key: 'a_color',
      kind: 'vec4',
    })
  })

  it('should create attribute tags for integer types', () => {
    expect(attribute.int('a_index')).toEqual({
      type: 'attribute',
      key: 'a_index',
      kind: 'int',
    })

    expect(attribute.ivec2('a_coords')).toEqual({
      type: 'attribute',
      key: 'a_coords',
      kind: 'ivec2',
    })
  })

  it('should create instanced attributes', () => {
    expect(attribute.vec3('a_instancePos', { instanced: true })).toEqual({
      type: 'attribute',
      key: 'a_instancePos',
      kind: 'vec3',
      instanced: true,
    })

    expect(attribute.float('a_instanceScale', { instanced: true })).toEqual({
      type: 'attribute',
      key: 'a_instanceScale',
      kind: 'float',
      instanced: true,
    })
  })

  it('should create attributes with custom buffer', () => {
    const customBuffer = {} as WebGLBuffer
    expect(attribute.vec2('a_position', { buffer: customBuffer })).toEqual({
      type: 'attribute',
      key: 'a_position',
      kind: 'vec2',
      buffer: customBuffer,
    })
  })

  it('should handle symbol properties correctly', () => {
    const symbolKey = Symbol('test')
    // @ts-expect-error Testing symbol access
    expect(attribute[symbolKey]).toBeUndefined()
  })
})

describe('interleave', () => {
  it('should create interleaved attribute tags', () => {
    expect(
      interleave('vertexData', [attribute.vec2('a_position'), attribute.vec4('a_color')]),
    ).toEqual({
      type: 'interleavedAttribute',
      key: 'vertexData',
      layout: [
        { key: 'a_position', kind: 'vec2' },
        { key: 'a_color', kind: 'vec4' },
      ],
      instanced: false,
    })
  })

  it('should create instanced interleaved attributes', () => {
    expect(
      interleave(
        'instanceData',
        [attribute.vec3('a_instancePos'), attribute.float('a_instanceScale')],
        { instanced: true },
      ),
    ).toEqual({
      type: 'interleavedAttribute',
      key: 'instanceData',
      layout: [
        { key: 'a_instancePos', kind: 'vec3' },
        { key: 'a_instanceScale', kind: 'float' },
      ],
      instanced: true,
    })
  })

  it('should handle custom buffer in options', () => {
    const customBuffer = {} as WebGLBuffer
    expect(interleave('uvData', [attribute.vec2('a_uv')], { buffer: customBuffer })).toEqual({
      type: 'interleavedAttribute',
      key: 'uvData',
      layout: [{ key: 'a_uv', kind: 'vec2' }],
      instanced: false,
      buffer: customBuffer,
    })
  })

  it('should strip instanced property from layout attributes', () => {
    expect(
      interleave('data', [attribute.vec2('a_position'), attribute.vec4('a_color')]).layout,
    ).toEqual([
      { key: 'a_position', kind: 'vec2' },
      { key: 'a_color', kind: 'vec4' },
    ])
  })
})

describe('glsl', () => {
  let gl: GL

  beforeEach(() => {
    gl = createMockGL()
  })

  it('should create GLSL template with uniforms and attributes', () => {
    const vertex = glsl`
      ${uniform.vec2('u_resolution')}
      ${attribute.vec2('a_position')}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const { schema } = compile(gl, vertex, glsl``)

    expect(schema.uniforms).toEqual({
      u_resolution: { kind: 'vec2' },
    })

    expect(schema.attributes).toEqual({
      a_position: { kind: 'vec2' },
    })

    expect(schema.interleavedAttributes).toEqual({})
  })

  it('should handle WebGL2 syntax with #version 300 es', () => {
    const vertex = glsl`#version 300 es
      ${uniform.vec2('u_resolution')}
      ${attribute.vec2('a_position')}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    // For this test, we need to check the shader compilation calls
    compile(gl, vertex, glsl``)

    // Check that shaderSource was called with WebGL2 syntax
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('in vec2 a_position')
    )
    expect(vertexShaderSource).toBeTruthy()
  })

  it('should handle interleaved attributes', () => {
    const vertex = glsl`
      ${interleave('vertexData', [attribute.vec2('a_position'), attribute.vec4('a_color')])}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const { schema } = compile(gl, vertex, glsl``)

    expect(schema.interleavedAttributes).toEqual({
      vertexData: {
        layout: [
          { key: 'a_position', kind: 'vec2' },
          { key: 'a_color', kind: 'vec4' },
        ],
        instanced: false,
      },
    })
  })

  it('should handle interleaved attributes in WebGL2', () => {
    const vertex = glsl`#version 300 es
      ${interleave('vertexData', [attribute.vec2('a_position'), attribute.vec4('a_color')])}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    compile(gl, vertex, glsl``)

    // Check that shaderSource was called with WebGL2 syntax
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('in vec2 a_position') && call[1].includes('in vec4 a_color')
    )
    expect(vertexShaderSource).toBeTruthy()
  })

  it('should handle uniform arrays', () => {
    const fragment = glsl`
      ${uniform.vec3('u_palette', { size: 7 })}
      
      void main() {
        gl_FragColor = vec4(u_palette[0], 1.0);
      }
    `

    const { schema } = compile(gl, glsl``, fragment)

    expect(schema.uniforms).toEqual({
      u_palette: { kind: 'vec3', size: 7 },
    })
  })

  it('should handle string and number interpolations', () => {
    const maxLights = 8
    const shaderName = 'MyShader'

    const fragment = glsl`
      // ${shaderName}
      #define MAX_LIGHTS ${maxLights}
      ${uniform.float('u_time')}
      
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `

    compile(gl, glsl``, fragment)

    // Check that shaderSource was called with the interpolated values
    const fragmentShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('// MyShader') && 
                       call[1].includes('#define MAX_LIGHTS 8') &&
                       call[1].includes('uniform float u_time;')
    )
    expect(fragmentShaderSource).toBeTruthy()
  })

  it('should handle multiple attributes and uniforms', () => {
    const vertex = glsl`
      ${uniform.mat4('u_mvpMatrix')}
      ${uniform.sampler2D('u_texture')}
      ${attribute.vec3('a_position')}
      ${attribute.vec2('a_uv')}
      ${attribute.vec4('a_color', { instanced: true })}
      
      void main() {
        gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
      }
    `

    const { schema } = compile(gl, vertex, glsl``)

    expect(schema.uniforms).toEqual({
      u_mvpMatrix: { kind: 'mat4' },
      u_texture: { kind: 'sampler2D' },
    })

    expect(schema.attributes).toEqual({
      a_position: { kind: 'vec3' },
      a_uv: { kind: 'vec2' },
      a_color: { kind: 'vec4', instanced: true },
    })
  })

  it('should handle empty template', () => {
    const { schema } = compile(gl, glsl``, glsl``)

    expect(schema.uniforms).toEqual({})
    expect(schema.attributes).toEqual({})
    expect(schema.interleavedAttributes).toEqual({})
  })

  it('should skip string resources when collecting schema', () => {
    const fragment = glsl`
      ${'// This is a comment'}
      ${42}
      ${uniform.float('u_time')}
      ${'precision highp float;'}
      
      void main() {}
    `

    const { schema } = compile(gl, glsl``, fragment)

    expect(schema.uniforms).toEqual({
      u_time: { kind: 'float' },
    })
    expect(Object.keys(schema.uniforms).length).toBe(1)
  })
})

describe('glsl with symbols', () => {
  let gl: GL

  beforeEach(() => {
    gl = createMockGL()
  })

  it('should support symbols in uniform tags', () => {
    const u_time_symbol = Symbol('u_time')
    const u_color_symbol = Symbol('u_color')

    const fragment = glsl`
      precision mediump float;
      
      ${uniform.float(u_time_symbol)}
      ${uniform.vec3(u_color_symbol)}
      
      void main() {
        gl_FragColor = vec4(${u_color_symbol} * ${u_time_symbol}, 1.0);
      }`

    const { schema } = compile(gl, glsl``, fragment)

    expect(schema.uniforms[u_time_symbol]).toEqual({ kind: 'float' })
    expect(schema.uniforms[u_color_symbol]).toEqual({ kind: 'vec3' })

    // Check that shaderSource was called with symbol aliases
    const fragmentShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('uniform float VIEW_GL_ALIAS_') && 
                       call[1].includes('uniform vec3 VIEW_GL_ALIAS_')
    )
    expect(fragmentShaderSource).toBeTruthy()
  })

  it('should support symbols in attribute tags', () => {
    const a_position_symbol = Symbol('a_position')
    const a_color_symbol = Symbol('a_color')

    const vertex = glsl`
      ${attribute.vec2(a_position_symbol)}
      ${attribute.vec4(a_color_symbol, { instanced: true })}
      
      void main() {
        gl_Position = vec4(${a_position_symbol}, 0.0, 1.0);
      }`

    const { schema } = compile(gl, vertex, glsl``)

    expect(schema.attributes[a_position_symbol]).toEqual({ kind: 'vec2' })
    expect(schema.attributes[a_color_symbol]).toEqual({ kind: 'vec4', instanced: true })

    // Check that shaderSource was called with symbol aliases
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('attribute vec2 VIEW_GL_ALIAS_') && 
                       call[1].includes('attribute vec4 VIEW_GL_ALIAS_')
    )
    expect(vertexShaderSource).toBeTruthy()
  })

  it('should support symbols in interleaved attribute tags', () => {
    const data_symbol = Symbol('data')
    const a_pos_symbol = Symbol('a_pos')
    const a_col_symbol = Symbol('a_col')

    const vertex = glsl`
      ${interleave(data_symbol, [attribute.vec3(a_pos_symbol), attribute.vec4(a_col_symbol)])}
      
      void main() {
        gl_Position = vec4(${a_pos_symbol}, 1.0);
      }`

    const { schema } = compile(gl, vertex, glsl``)

    expect(schema.interleavedAttributes[data_symbol]).toEqual({
      layout: [
        { key: a_pos_symbol, kind: 'vec3' },
        { key: a_col_symbol, kind: 'vec4' },
      ],
      instanced: false,
    })

    // Check that shaderSource was called with symbol aliases
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('attribute vec3 VIEW_GL_ALIAS_') && 
                       call[1].includes('attribute vec4 VIEW_GL_ALIAS_')
    )
    expect(vertexShaderSource).toBeTruthy()
  })

  it('should support mixed string and symbol keys', () => {
    const u_color_symbol = Symbol('u_color')
    const a_normal_symbol = Symbol('a_normal')

    const vertex = glsl`
      ${attribute.vec3('a_position')}
      ${attribute.vec3(a_normal_symbol)}
      ${uniform.float('u_time')}
      
      void main() {
        gl_Position = vec4(a_position + ${a_normal_symbol}, u_time);
      }`

    const fragment = glsl`
      ${uniform.float('u_time')}
      ${uniform.vec3(u_color_symbol)}
      
      void main() {
        gl_FragColor = vec4(${u_color_symbol}, 1.0);
      }`

    const { schema } = compile(gl, vertex, fragment)

    expect(schema.uniforms.u_time).toEqual({ kind: 'float' })
    expect(schema.uniforms[u_color_symbol]).toEqual({ kind: 'vec3' })
    expect(schema.attributes.a_position).toEqual({ kind: 'vec3' })
    expect(schema.attributes[a_normal_symbol]).toEqual({ kind: 'vec3' })

    // Check vertex shader source
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('attribute vec3 a_position') && 
                       call[1].includes('attribute vec3 VIEW_GL_ALIAS_')
    )
    expect(vertexShaderSource).toBeTruthy()

    // Check fragment shader source
    const fragmentShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('uniform float u_time') && 
                       call[1].includes('uniform vec3 VIEW_GL_ALIAS_')
    )
    expect(fragmentShaderSource).toBeTruthy()
  })

  it('should support symbols in array uniforms', () => {
    const u_positions_symbol = Symbol('u_positions')

    const fragment = glsl`
      ${uniform.vec3(u_positions_symbol, { size: 10 })}
      
      void main() {
        gl_FragColor = vec4(${u_positions_symbol}[0], 1.0);
      }`

    const { schema } = compile(gl, glsl``, fragment)

    expect(schema.uniforms[u_positions_symbol]).toEqual({ kind: 'vec3', size: 10 })

    // Check that shaderSource was called with array syntax
    const fragmentShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('uniform vec3 VIEW_GL_ALIAS_') && 
                       call[1].includes('[10];')
    )
    expect(fragmentShaderSource).toBeTruthy()
  })

  it('should preserve symbol identity across multiple uses', () => {
    const u_shared_symbol = Symbol('u_shared')

    const fragment1 = glsl`${uniform.float(u_shared_symbol)}
void main() { gl_FragColor = vec4(1.0); }`
    const fragment2 = glsl`${uniform.float(u_shared_symbol)}
void main() { gl_FragColor = vec4(0.5); }`

    compile(gl, glsl``, fragment1)
    compile(gl, glsl``, fragment2)

    // Both should generate the same alias
    const shader1Source = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('gl_FragColor = vec4(1.0)')
    )?.[1]
    const shader2Source = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('gl_FragColor = vec4(0.5)')
    )?.[1]

    const alias1 = shader1Source?.match(/VIEW_GL_ALIAS_\d+/)?.[0]
    const alias2 = shader2Source?.match(/VIEW_GL_ALIAS_\d+/)?.[0]

    expect(alias1).toBe(alias2)
  })

  it('should support symbols in WebGL 2.0 shaders', () => {
    const u_matrix_symbol = Symbol('u_matrix')
    const a_vertex_symbol = Symbol('a_vertex')

    const vertex = glsl`#version 300 es
      precision mediump float;
      
      ${uniform.mat4(u_matrix_symbol)}
      ${attribute.vec3(a_vertex_symbol)}
      
      void main() {
        gl_Position = ${u_matrix_symbol} * vec4(${a_vertex_symbol}, 1.0);
      }`

    compile(gl, vertex, glsl``)

    // Check that shaderSource was called with WebGL2 syntax and symbol aliases
    const vertexShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('uniform mat4 VIEW_GL_ALIAS_') && 
                       call[1].includes('in vec3 VIEW_GL_ALIAS_')
    )
    expect(vertexShaderSource).toBeTruthy()
  })

  it('should handle symbol interpolation in template', () => {
    const color_symbol = Symbol('color')

    const fragment = glsl`
      void main() {
        vec3 ${color_symbol} = vec3(1.0, 0.0, 0.0);
        gl_FragColor = vec4(${color_symbol}, 1.0);
      }`

    compile(gl, glsl``, fragment)

    // Check that shaderSource was called with symbol aliases in template
    const fragmentShaderSource = (gl.shaderSource as any).mock.calls.find(
      (call: any[]) => call[1].includes('vec3') && call[1].includes('VIEW_GL_ALIAS_')
    )?.[1]

    expect(fragmentShaderSource).toMatch(/vec3 VIEW_GL_ALIAS_\d+ = vec3/)
    expect(fragmentShaderSource).toMatch(/vec4\(VIEW_GL_ALIAS_\d+, 1\.0\)/)
  })
})

describe('compile with symbols', () => {
  let gl: GL
  let mockProgram: WebGLProgram

  beforeEach(() => {
    gl = createMockGL()
    mockProgram = gl.createProgram()!

    // Mock shader creation and compilation
    gl.createShader = vi.fn(type => ({ type } as WebGLShader))
    gl.shaderSource = vi.fn()
    gl.compileShader = vi.fn()
    gl.getShaderParameter = vi.fn(() => true)
    gl.attachShader = vi.fn()
    gl.linkProgram = vi.fn()
    gl.getProgramParameter = vi.fn(() => true)
    gl.createProgram = vi.fn(() => mockProgram)
  })

  it('should compile shaders with symbol keys', () => {
    const u_time_symbol = Symbol('u_time')
    const a_position_symbol = Symbol('a_position')

    const vertex = glsl`
      ${attribute.vec2(a_position_symbol)}
      ${uniform.float(u_time_symbol)}
      
      void main() {
        gl_Position = vec4(${a_position_symbol}, 0.0, 1.0);
      }`

    const fragment = glsl`
      precision mediump float;
      
      ${uniform.float(u_time_symbol)}
      
      void main() {
        gl_FragColor = vec4(${u_time_symbol}, 0.0, 0.0, 1.0);
      }`

    const { program, schema } = compile(gl, vertex, fragment)

    expect(program).toBe(mockProgram)
    expect(schema.uniforms[u_time_symbol]).toEqual({ kind: 'float' })
    expect(schema.attributes[a_position_symbol]).toEqual({ kind: 'vec2' })
  })

  it('should merge symbols from vertex and fragment shaders', () => {
    const u_shared_symbol = Symbol('u_shared')
    const u_vertex_only = Symbol('u_vertex_only')
    const u_fragment_only = Symbol('u_fragment_only')

    const vertex = glsl`
      ${uniform.float(u_shared_symbol)}
      ${uniform.vec2(u_vertex_only)}
      
      void main() {
        gl_Position = vec4(${u_vertex_only}, ${u_shared_symbol}, 1.0);
      }`

    const fragment = glsl`
      precision mediump float;
      
      ${uniform.float(u_shared_symbol)}
      ${uniform.vec3(u_fragment_only)}
      
      void main() {
        gl_FragColor = vec4(${u_fragment_only}, ${u_shared_symbol});
      }`

    const { schema } = compile(gl, vertex, fragment)

    expect(schema.uniforms[u_shared_symbol]).toEqual({ kind: 'float' })
    expect(schema.uniforms[u_vertex_only]).toEqual({ kind: 'vec2' })
    expect(schema.uniforms[u_fragment_only]).toEqual({ kind: 'vec3' })
  })
})

describe('compile', () => {
  let gl: GL
  let mockProgram: WebGLProgram

  beforeEach(() => {
    gl = createMockGL()
    mockProgram = gl.createProgram()!

    // Mock shader creation and compilation
    gl.createShader = vi.fn(type => ({ type } as WebGLShader))
    gl.shaderSource = vi.fn()
    gl.compileShader = vi.fn()
    gl.getShaderParameter = vi.fn(() => true)
    gl.attachShader = vi.fn()
    gl.linkProgram = vi.fn()
    gl.getProgramParameter = vi.fn(() => true)
    gl.createProgram = vi.fn(() => mockProgram)
  })

  it('should compile shaders and return program with schema', () => {
    const vertex = glsl`
      ${attribute.vec2('a_position')}
      ${uniform.mat4('u_mvpMatrix')}
      
      void main() {
        gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
      }
    `

    const fragment = glsl`
      ${uniform.vec4('u_color')}
      ${uniform.sampler2D('u_texture')}
      
      void main() {
        gl_FragColor = u_color * texture2D(u_texture, vec2(0.0));
      }
    `

    const result = compile(gl, vertex, fragment)

    expect(result.program).toBe(mockProgram)

    expect(result.schema.uniforms).toEqual({
      u_mvpMatrix: { kind: 'mat4' },
      u_color: { kind: 'vec4' },
      u_texture: { kind: 'sampler2D' },
    })

    expect(result.schema.attributes).toEqual({
      a_position: { kind: 'vec2' },
    })

    expect(result.schema.interleavedAttributes).toEqual({})
  })

  it('should merge uniforms from vertex and fragment shaders', () => {
    const vertex = glsl`
      ${uniform.vec2('u_resolution')}
      ${uniform.float('u_time')}
      
      void main() {}
    `

    const fragment = glsl`
      ${uniform.float('u_time')} // Same uniform in both shaders
      ${uniform.vec3('u_color')}
      
      void main() {}
    `

    const result = compile(gl, vertex, fragment)

    expect(result.schema.uniforms).toEqual({
      u_resolution: { kind: 'vec2' },
      u_time: { kind: 'float' },
      u_color: { kind: 'vec3' },
    })
  })

  it('should merge attributes and interleaved attributes from vertex and fragment', () => {
    const vertex = glsl`
      ${attribute.vec3('a_position')}
      ${interleave('vertexData', [attribute.vec2('a_uv'), attribute.vec3('a_normal')])}
      
      void main() {}
    `

    const fragment = glsl`
      ${attribute.vec4('a_color')} // Fragment attributes (rare but valid)
      ${interleave('materialData', [attribute.float('a_roughness'), attribute.float('a_metallic')])}
      
      void main() {}
    `

    const result = compile(gl, vertex, fragment)

    expect(result.schema.attributes).toEqual({
      a_position: { kind: 'vec3' },
      a_color: { kind: 'vec4' },
    })

    expect(result.schema.interleavedAttributes).toEqual({
      vertexData: {
        layout: [
          { key: 'a_uv', kind: 'vec2' },
          { key: 'a_normal', kind: 'vec3' },
        ],
        instanced: false,
      },
      materialData: {
        layout: [
          { key: 'a_roughness', kind: 'float' },
          { key: 'a_metallic', kind: 'float' },
        ],
        instanced: false,
      },
    })
  })

  it('should merge schemas with symbol keys', () => {
    const u_time_symbol = Symbol('u_time')
    const a_pos_symbol = Symbol('a_pos')
    const data_symbol = Symbol('data')

    const vertex = glsl`
      ${uniform.float(u_time_symbol)}
      ${attribute.vec2(a_pos_symbol)}
      ${interleave(data_symbol, [attribute.vec3('a_normal')])}
      
      void main() {}
    `

    const fragment = glsl`
      ${uniform.float(u_time_symbol)} // Same symbol in both shaders
      ${uniform.vec3('u_color')}
      
      void main() {}
    `

    const result = compile(gl, vertex, fragment)

    expect(result.schema.uniforms).toEqual({
      [u_time_symbol]: { kind: 'float' },
      u_color: { kind: 'vec3' },
    })

    expect(result.schema.attributes).toEqual({
      [a_pos_symbol]: { kind: 'vec2' },
    })

    expect(result.schema.interleavedAttributes).toEqual({
      [data_symbol]: {
        layout: [
          { key: 'a_normal', kind: 'vec3' },
        ],
        instanced: false,
      },
    })
  })

  it('should handle interleaved attributes in schema', () => {
    const vertexData = interleave('vertexData', [
      attribute.vec2('a_position'),
      attribute.vec2('a_uv'),
    ])

    const instanceData = interleave(
      'instanceData',
      [attribute.vec3('a_instancePos'), attribute.float('a_instanceScale')],
      { instanced: true },
    )

    const vertex = glsl`
      ${vertexData}
      ${instanceData}
      
      void main() {
        gl_Position = vec4(a_position + a_instancePos.xy, 0.0, 1.0);
      }
    `

    const result = compile(gl, vertex, glsl``)

    expect(result.schema.interleavedAttributes).toEqual({
      vertexData: {
        layout: [
          { key: 'a_position', kind: 'vec2' },
          { key: 'a_uv', kind: 'vec2' },
        ],
        instanced: false,
      },
      instanceData: {
        layout: [
          { key: 'a_instancePos', kind: 'vec3' },
          { key: 'a_instanceScale', kind: 'float' },
        ],
        instanced: true,
      },
    })
  })

  it('should handle shaders with only template strings', () => {
    const vertex = glsl`
      void main() {
        gl_Position = vec4(0.0);
      }
    `

    const fragment = glsl`
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `

    const result = compile(gl, vertex, fragment)

    expect(result.program).toBe(mockProgram)
    expect(result.schema.uniforms).toEqual({})
    expect(result.schema.attributes).toEqual({})
    expect(result.schema.interleavedAttributes).toEqual({})
  })

  it('should call WebGL functions in correct order', () => {
    const vertex = glsl`void main() {}`
    const fragment = glsl`void main() {}`

    compile(gl, vertex, fragment)

    // Check shader creation
    expect(gl.createShader).toHaveBeenCalledTimes(2)
    expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER)
    expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER)

    // Check shader compilation
    expect(gl.shaderSource).toHaveBeenCalledTimes(2)
    expect(gl.compileShader).toHaveBeenCalledTimes(2)
    expect(gl.getShaderParameter).toHaveBeenCalledTimes(2)

    // Check program creation and linking
    expect(gl.createProgram).toHaveBeenCalled()
    expect(gl.attachShader).toHaveBeenCalledTimes(2)
    expect(gl.linkProgram).toHaveBeenCalled()
    expect(gl.getProgramParameter).toHaveBeenCalled()
  })
})
