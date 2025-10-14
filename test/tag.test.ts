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
  it('should create GLSL template with uniforms and attributes', () => {
    const result = glsl`
      ${uniform.vec2('u_resolution')}
      ${attribute.vec2('a_position')}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    expect(result.template).toContain('uniform vec2 u_resolution;')
    expect(result.template).toContain('attribute vec2 a_position;')
    expect(result.template).toContain('void main()')

    expect(result.uniforms).toEqual({
      u_resolution: { kind: 'vec2' },
    })

    expect(result.attributes).toEqual({
      a_position: { kind: 'vec2' },
    })

    expect(result.interleavedAttributes).toEqual({})
  })

  it('should handle WebGL2 syntax with #version 300 es', () => {
    const result = glsl`#version 300 es
      ${uniform.vec2('u_resolution')}
      ${attribute.vec2('a_position')}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    expect(result.template).toContain('uniform vec2 u_resolution;')
    expect(result.template).toContain('in vec2 a_position;') // 'in' instead of 'attribute'
  })

  it('should handle interleaved attributes', () => {
    const result = glsl`
      ${interleave('vertexData', [attribute.vec2('a_position'), attribute.vec4('a_color')])}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    expect(result.template).toContain('attribute vec2 a_position;')
    expect(result.template).toContain('attribute vec4 a_color;')

    expect(result.interleavedAttributes).toEqual({
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
    const result = glsl`#version 300 es
      ${interleave('vertexData', [attribute.vec2('a_position'), attribute.vec4('a_color')])}
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    expect(result.template).toContain('in vec2 a_position;')
    expect(result.template).toContain('in vec4 a_color;')
  })

  it('should handle uniform arrays', () => {
    const result = glsl`
      ${uniform.vec3('u_palette', { size: 7 })}
      
      void main() {
        gl_FragColor = vec4(u_palette[0], 1.0);
      }
    `

    expect(result.template).toContain('uniform vec3 u_palette[7];')

    expect(result.uniforms).toEqual({
      u_palette: { kind: 'vec3', size: 7 },
    })
  })

  it('should handle string and number interpolations', () => {
    const maxLights = 8
    const shaderName = 'MyShader'

    const result = glsl`
      // ${shaderName}
      #define MAX_LIGHTS ${maxLights}
      ${uniform.float('u_time')}
      
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `

    expect(result.template).toContain('// MyShader')
    expect(result.template).toContain('#define MAX_LIGHTS 8')
    expect(result.template).toContain('uniform float u_time;')
  })

  it('should handle multiple attributes and uniforms', () => {
    const result = glsl`
      ${uniform.mat4('u_mvpMatrix')}
      ${uniform.sampler2D('u_texture')}
      ${attribute.vec3('a_position')}
      ${attribute.vec2('a_uv')}
      ${attribute.vec4('a_color', { instanced: true })}
      
      void main() {
        gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
      }
    `

    expect(result.uniforms).toEqual({
      u_mvpMatrix: { kind: 'mat4' },
      u_texture: { kind: 'sampler2D' },
    })

    expect(result.attributes).toEqual({
      a_position: { kind: 'vec3' },
      a_uv: { kind: 'vec2' },
      a_color: { kind: 'vec4', instanced: true },
    })
  })

  it('should handle empty template', () => {
    const result = glsl``

    expect(result.template).toBe('')
    expect(result.uniforms).toEqual({})
    expect(result.attributes).toEqual({})
    expect(result.interleavedAttributes).toEqual({})
  })

  it('should skip string resources when collecting schema', () => {
    const result = glsl`
      ${'// This is a comment'}
      ${42}
      ${uniform.float('u_time')}
      ${'precision highp float;'}
      
      void main() {}
    `

    expect(result.uniforms).toEqual({
      u_time: { kind: 'float' },
    })
    expect(Object.keys(result.uniforms).length).toBe(1)
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

    const fragment = glsl`
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `

    const result = compile(gl, vertex, fragment)

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
