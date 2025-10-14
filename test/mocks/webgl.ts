import { vi } from 'vitest'

interface MockWebGLBuffer extends WebGLBuffer {
  id: number
}

interface MockWebGLProgram extends WebGLProgram {
  id: number
}

interface MockWebGLShader extends WebGLShader {
  id: number
}

interface MockWebGLTexture extends WebGLTexture {
  id: number
}

interface MockWebGLFramebuffer extends WebGLFramebuffer {
  id: number
}

interface MockWebGLVertexArrayObject extends WebGLVertexArrayObject {
  id: number
}

export function createMockGL() {
  const buffers = new Map<number, MockWebGLBuffer>()
  const programs = new Map<number, MockWebGLProgram>()
  const shaders = new Map<number, MockWebGLShader>()
  const textures = new Map<number, MockWebGLTexture>()
  const framebuffers = new Map<number, MockWebGLFramebuffer>()
  const vertexArrays = new Map<number, MockWebGLVertexArrayObject>()

  let nextId = 1

  const mockGL = {
    // Constants
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    INT: 0x1404,
    UNSIGNED_BYTE: 0x1401,
    TRIANGLES: 0x0004,
    LINES: 0x0001,
    TRIANGLE_STRIP: 0x0005,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER: 0x8d40,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,

    // Buffer methods
    createBuffer: vi.fn(() => {
      const buffer = { id: nextId++ } as MockWebGLBuffer
      buffers.set(buffer.id, buffer)
      return buffer
    }),

    deleteBuffer: vi.fn((buffer: MockWebGLBuffer) => {
      if (buffer) buffers.delete(buffer.id)
    }),

    bindBuffer: vi.fn((target: number, buffer: MockWebGLBuffer | null) => {
      // Buffer binding logic would go here
    }),

    bufferData: vi.fn(),

    // Program methods
    createProgram: vi.fn(() => {
      const program = { id: nextId++ } as MockWebGLProgram
      programs.set(program.id, program)
      return program
    }),

    deleteProgram: vi.fn((program: MockWebGLProgram) => {
      if (program) programs.delete(program.id)
    }),

    useProgram: vi.fn((program: MockWebGLProgram | null) => {
      // Program usage logic would go here
    }),

    linkProgram: vi.fn(),
    attachShader: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),

    // Shader methods
    createShader: vi.fn((type: number) => {
      const shader = { id: nextId++, type } as MockWebGLShader
      shaders.set(shader.id, shader)
      return shader
    }),

    deleteShader: vi.fn((shader: MockWebGLShader) => {
      if (shader) shaders.delete(shader.id)
    }),

    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),

    // Attribute methods
    getAttribLocation: vi.fn((program: MockWebGLProgram, name: string) => {
      // Return incrementing location for each unique name
      return name.charCodeAt(0) % 16
    }),

    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),

    // Uniform methods
    getUniformLocation: vi.fn((program: MockWebGLProgram, name: string) => {
      return { id: nextId++, name } as WebGLUniformLocation
    }),

    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3i: vi.fn(),
    uniform3f: vi.fn(),
    uniform4i: vi.fn(),
    uniform4f: vi.fn(),
    uniform1fv: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniform1iv: vi.fn(),
    uniform2iv: vi.fn(),
    uniform3iv: vi.fn(),
    uniform4iv: vi.fn(),
    uniformMatrix2fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Drawing methods
    drawArrays: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawElements: vi.fn(),

    // Texture methods
    createTexture: vi.fn(() => {
      const texture = { id: nextId++ } as MockWebGLTexture
      textures.set(texture.id, texture)
      return texture
    }),

    deleteTexture: vi.fn((texture: MockWebGLTexture) => {
      if (texture) textures.delete(texture.id)
    }),

    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    activeTexture: vi.fn(),

    // Framebuffer methods
    createFramebuffer: vi.fn(() => {
      const framebuffer = { id: nextId++ } as MockWebGLFramebuffer
      framebuffers.set(framebuffer.id, framebuffer)
      return framebuffer
    }),

    deleteFramebuffer: vi.fn((framebuffer: MockWebGLFramebuffer) => {
      if (framebuffer) framebuffers.delete(framebuffer.id)
    }),

    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),

    // VAO methods (WebGL2)
    createVertexArray: vi.fn(() => {
      const vao = { id: nextId++ } as MockWebGLVertexArrayObject
      vertexArrays.set(vao.id, vao)
      return vao
    }),

    deleteVertexArray: vi.fn((vao: MockWebGLVertexArrayObject) => {
      if (vao) vertexArrays.delete(vao.id)
    }),

    bindVertexArray: vi.fn(),

    // Extensions
    getExtension: vi.fn((name: string) => {
      if (name === 'ANGLE_instanced_arrays') {
        return {
          vertexAttribDivisorANGLE: mockGL.vertexAttribDivisor.bind(mockGL),
          drawArraysInstancedANGLE: mockGL.drawArraysInstanced.bind(mockGL),
          drawElementsInstancedANGLE: mockGL.drawElements.bind(mockGL),
        }
      }
      if (name === 'OES_vertex_array_object') {
        return {
          createVertexArrayOES: mockGL.createVertexArray.bind(mockGL),
          deleteVertexArrayOES: mockGL.deleteVertexArray.bind(mockGL),
          bindVertexArrayOES: mockGL.bindVertexArray.bind(mockGL),
        }
      }
      return null
    }),

    // State
    viewport: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthFunc: vi.fn(),
    cullFace: vi.fn(),

    // Error handling
    getError: vi.fn(() => 0),
  }

  return mockGL as any
}

export function createMockCanvas() {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'width', { value: 800, writable: true })
  Object.defineProperty(canvas, 'height', { value: 600, writable: true })

  const gl = createMockGL()
  canvas.getContext = vi.fn((contextType: string) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return gl as any
    }
    return null
  })

  return { canvas, gl }
}
