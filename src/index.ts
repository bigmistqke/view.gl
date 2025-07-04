import type {
  BufferOptions,
  GL,
  InferAttributes,
  InferAttributeSetters,
  InferBuffers,
  InferBufferSetters,
  InferFramebuffers,
  InferFramebufferSetters,
  InferTextures,
  InferTextureSetters,
  InferUniforms,
  InferUniformSetters,
  InterleaveAttributes,
  Program,
  ProgramConfig,
  ProgramState,
  ShaderConfig,
  TextureOptions,
} from './types'

function mapObject<TSource extends object, TReturn>(
  source: TSource,
  callback: <U extends keyof TSource>(value: TSource[U], key: U) => TReturn,
): { [TKey in keyof TSource]: TReturn } {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, callback(value, key as keyof TSource)]),
  ) as { [TKey in keyof TSource]: TReturn }
}

const checkWebGL2 = (gl: GL): gl is WebGL2RenderingContext =>
  'WebGL2RenderingContext' in window && gl instanceof WebGL2RenderingContext

const SIZE_MAP = {
  '1f': 1,
  '2f': 2,
  '3f': 3,
  '4f': 4,
  '1i': 1,
  '2i': 2,
  '3i': 3,
  '4i': 4,
  mat3: 9,
  mat4: 16,
} as const

export function createProgram<T extends ProgramConfig>(
  shaderConfig: ShaderConfig,
  config: T,
  initialData?: {
    buffers?: T['buffers'] extends Record<string, BufferOptions>
      ? {
          [K in keyof T['buffers']]?: Float32Array | Uint16Array | Uint32Array
        }
      : never
    textures?: T['textures'] extends Record<string, TextureOptions>
      ? {
          [K in keyof T['textures']]?: ArrayBufferView | null
        }
      : never
  },
): Program<T> {
  const { gl, vertex, fragment } = shaderConfig

  const isWebGL2 = checkWebGL2(gl)

  const program = createShaderProgram(gl, vertex, fragment)
  const state: ProgramState = isWebGL2
    ? {
        gl,
        program,
        isWebGL2,
        vertexArrayObject: gl.createVertexArray(),
      }
    : {
        gl,
        program,
        isWebGL2,
        instancedArraysExt: gl.getExtension('ANGLE_instanced_arrays'),
      }

  // Enable WebGL1 floating-point texture support if available
  if (!state.isWebGL2) {
    gl.getExtension('OES_texture_float')
    gl.getExtension('WEBGL_color_buffer_float')
  }

  const uniforms = createUniforms(state, config)
  const attributes = createAttributes(state, config)
  const buffers = createBuffers(state, config, initialData)
  const textures = createTextures(state, config, initialData)
  const framebuffers = createFramebufferSetters(state, config)

  return {
    uniforms: uniforms?.setters as InferUniformSetters<T['uniforms']>,
    attributes: attributes?.setters as InferAttributeSetters<T['attributes']>,
    interleaveAttributes: attributes?.interleave as InterleaveAttributes<T['attributes']>,
    buffers: buffers?.setters as InferBufferSetters<T['buffers']>,
    textures: textures?.setters as InferTextureSetters<T['textures']>,
    framebuffers: framebuffers?.setters as InferFramebufferSetters<T['framebuffers']>,
    use() {
      gl.useProgram(state.program)
      if (state.isWebGL2) {
        state.gl.bindVertexArray(state.vertexArrayObject)
      }
    },
    drawArrays: gl.drawArrays.bind(gl),
    drawElements: gl.drawElements.bind(gl),
    drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number) {
      if (state.isWebGL2) {
        state.gl.drawArraysInstanced(mode, first, count, instanceCount)
      } else if (state.instancedArraysExt) {
        state.instancedArraysExt.drawArraysInstancedANGLE(mode, first, count, instanceCount)
      } else {
        // Fallback to regular draw
        gl.drawArrays(mode, first, count)
      }
    },
    drawElementsInstanced(
      mode: number,
      count: number,
      type: number,
      offset: number,
      instanceCount: number,
    ) {
      if (state.isWebGL2) {
        state.gl.drawElementsInstanced(mode, count, type, offset, instanceCount)
      } else if (state.instancedArraysExt) {
        state.instancedArraysExt.drawElementsInstancedANGLE(
          mode,
          count,
          type,
          offset,
          instanceCount,
        )
      } else {
        // Fallback to regular draw
        gl.drawElements(mode, count, type, offset)
      }
    },
    dispose() {
      gl.deleteProgram(state.program)

      uniforms?.dispose()
      attributes?.dispose()
      buffers?.dispose()
      textures?.dispose()
      framebuffers?.dispose()
      // instancedAttributes?.dispose()

      if (state.vertexArrayObject && 'deleteVertexArray' in gl) {
        gl.deleteVertexArray(state.vertexArrayObject)
      }
    },
  }
}

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(
      `Failed to compile ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${info}`,
    )
  }

  return shader
}

function createShaderProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create WebGL program')

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error(`Failed to link program: ${info}`)
  }

  // Clean up shaders after linking
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  return program
}

/**********************************************************************************/
/*                                                                                */
/*                                   Create Uniforms                              */
/*                                                                                */
/**********************************************************************************/

function createUniforms<T extends ProgramConfig>(
  state: ProgramState,
  config: T,
): InferUniforms<T['uniforms']> {
  if (!config.uniforms) return undefined as InferUniforms<T['uniforms']>

  const uniforms = new Map()
  // Setup uniforms
  if (config.uniforms) {
    for (const [name, type] of Object.entries(config.uniforms)) {
      const location = state.gl.getUniformLocation(state.program, name)
      uniforms.set(name, { type, location })
    }
  }
  return {
    dispose() {
      uniforms.clear()
    },
    setters: mapObject(config.uniforms, (_, name) => {
      return {
        set: (...args: any[]) => {
          const uniform = uniforms.get(name)
          if (!uniform || !uniform.location) return

          switch (uniform.type) {
            case 'mat3':
              state.gl.uniformMatrix3fv(uniform.location, false, args[0])
              break
            case 'mat4':
              state.gl.uniformMatrix4fv(uniform.location, false, args[0])
              break
            default:
              state.gl[`uniform${uniform.type}`](uniform.location, ...args)
          }
        },
      }
    }),
  } as NonNullable<InferUniforms<T['uniforms']>>
}

/**********************************************************************************/
/*                                                                                */
/*                             Create Attribute Setters                           */
/*                                                                                */
/**********************************************************************************/

function createAttributes<T extends ProgramConfig>(
  state: ProgramState,
  config: T,
): InferAttributes<T['attributes']> {
  if (!config.attributes) return undefined as InferAttributes<T['attributes']>

  const attributes = new Map<string, { location: number; buffer: WebGLBuffer; size: number }>()
  const buffers = new Set<WebGLBuffer>()

  for (const name in config.attributes) {
    const location = state.gl.getAttribLocation(state.program, name)
    if (location >= 0) {
      const buffer = state.gl.createBuffer()
      buffers.add(buffer)
      attributes.set(name, {
        location,
        size: SIZE_MAP[config.attributes![name]],
        buffer,
      })
    }
  }

  function getAttribute(name: string) {
    const attribute = attributes.get(name)
    if (!attribute) {
      throw new Error()
    }
    return attribute
  }

  function handleAttribute(
    location: number,
    size: number,
    stride: number,
    offset: number,
    instancing: boolean,
  ) {
    state.gl.enableVertexAttribArray(location)
    state.gl.vertexAttribPointer(location, size, state.gl.FLOAT, false, stride, offset)

    if (state.isWebGL2) {
      state.gl.vertexAttribDivisor(location, instancing ? 1 : 0)
    } else if (state.instancedArraysExt) {
      state.instancedArraysExt.vertexAttribDivisorANGLE(location, instancing ? 1 : 0)
    }
  }

  return {
    dispose() {
      for (const buffer of buffers.values()) {
        if (buffer) {
          state.gl.deleteBuffer(buffer)
        }
      }
    },
    interleave(layout: Array<string>) {
      let offset = 0

      const attributes = layout.map(name => {
        const { location, size } = getAttribute(name)
        const result = {
          size,
          location,
          offset,
        }
        offset += size * 4
        return result
      })

      const buffer = state.gl.createBuffer()
      buffers.add(buffer)
      const interleavedAttribute = {
        buffer,
        stride: offset,
        attributes,
      }

      return {
        bind(instancing: boolean) {
          state.gl.bindBuffer(state.gl.ARRAY_BUFFER, interleavedAttribute.buffer)
          for (const { size, location, offset } of interleavedAttribute.attributes) {
            handleAttribute(location, size, interleavedAttribute.stride, offset, instancing)
          }
        },
        set(value: Float32Array) {
          state.gl.bindBuffer(state.gl.ARRAY_BUFFER, interleavedAttribute.buffer)
          state.gl.bufferData(state.gl.ARRAY_BUFFER, value, state.gl.DYNAMIC_DRAW)
        },
      }
    },
    setters: mapObject(config.attributes, (_, name) => {
      return {
        bind(instancing: boolean) {
          const attribute = getAttribute(name)
          state.gl.bindBuffer(state.gl.ARRAY_BUFFER, attribute.buffer)
          handleAttribute(attribute.location, attribute.size, 0, 0, instancing)
        },
        set(data: Float32Array) {
          const attribute = getAttribute(name)
          state.gl.bindBuffer(state.gl.ARRAY_BUFFER, attribute.buffer)
          state.gl.bufferData(state.gl.ARRAY_BUFFER, data, state.gl.DYNAMIC_DRAW)
        },
      }
    }),
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                    Create Buffers                              */
/*                                                                                */
/**********************************************************************************/

function createBuffers<T extends ProgramConfig>(
  { gl }: ProgramState,
  config: T,
  initialData?: {
    buffers?: T['buffers'] extends Record<string, BufferOptions>
      ? {
          [K in keyof T['buffers']]?: Float32Array | Uint16Array | Uint32Array
        }
      : never
  },
): InferBuffers<T['buffers']> {
  if (!config.buffers) return undefined

  const buffers = new Map()

  const api: NonNullable<InferBuffers<T['buffers']>> = {
    dispose() {
      // Clean up managed buffers
      for (const buffer of buffers.values()) {
        gl.deleteBuffer(buffer)
      }
      buffers.clear()
    },
    setters: mapObject(config.buffers, (bufferConfig, name) => {
      const target = bufferConfig.target ? gl[bufferConfig.target] : gl.ARRAY_BUFFER
      const usage = bufferConfig.usage ? gl[bufferConfig.usage] : gl.STATIC_DRAW

      return {
        set: (data: Float32Array | Uint16Array | Uint32Array) => {
          // Clean up existing buffer if it exists
          const existingBuffer = buffers.get(name)
          if (existingBuffer) {
            gl.deleteBuffer(existingBuffer)
          }

          // Create new buffer
          const buffer = createBuffer(gl, data, target, usage)
          buffers.set(name, buffer)
          return buffer
        },
        get: () => {
          return buffers.get(name)
        },
        bind: () => {
          const buffer = buffers.get(name)
          if (buffer) {
            gl.bindBuffer(target, buffer)
          }
        },
      }
    }),
  }

  // Initialize buffers if provided
  if (initialData?.buffers) {
    for (const [name, data] of Object.entries(initialData.buffers)) {
      if (data) {
        api.setters[name].set(data)
      }
    }
  }

  return api
}

/**********************************************************************************/
/*                                                                                */
/*                                  Create Textures                               */
/*                                                                                */
/**********************************************************************************/

function createTextures<T extends ProgramConfig>(
  state: ProgramState,
  config: T,
  initialData?: {
    textures?: T['textures'] extends Record<string, TextureOptions>
      ? {
          [K in keyof T['textures']]?: ArrayBufferView | null
        }
      : never
  },
): InferTextures<T['textures']> {
  if (!config.textures) return undefined

  const textures = new Map()

  const api = {
    dispose() {
      // Clean up managed textures
      for (const texture of textures.values()) {
        state.gl.deleteTexture(texture)
      }
      textures.clear()
    },
    setters: mapObject(config.textures, (textureConfig, name) => {
      const target = getGLConstant(state.gl, textureConfig.target, 'TEXTURE_2D')
      const internalFormat = getGLConstant(state.gl, textureConfig.internalFormat, 'RGBA')
      const format = getGLConstant(state.gl, textureConfig.format, 'RGBA')
      const type = getGLConstant(state.gl, textureConfig.type, 'UNSIGNED_BYTE')
      const minFilter = getGLConstant(state.gl, textureConfig.minFilter, 'NEAREST')
      const magFilter = getGLConstant(state.gl, textureConfig.magFilter, 'NEAREST')
      const wrapS = getGLConstant(state.gl, textureConfig.wrapS, 'CLAMP_TO_EDGE')
      const wrapT = getGLConstant(state.gl, textureConfig.wrapT, 'CLAMP_TO_EDGE')

      return {
        set: (data?: ArrayBufferView | null) => {
          // Clean up existing texture if it exists
          const existingTexture = textures.get(name)
          if (existingTexture) {
            state.gl.deleteTexture(existingTexture)
          }

          // Create new texture
          const texture = state.gl.createTexture()
          if (!texture) throw new Error(`Failed to create texture: ${name}`)

          state.gl.bindTexture(target, texture)
          state.gl.texImage2D(
            target,
            0,
            internalFormat,
            textureConfig.width,
            textureConfig.height,
            0,
            format,
            type,
            data || textureConfig.data || null,
          )

          // Set texture parameters
          state.gl.texParameteri(target, state.gl.TEXTURE_MIN_FILTER, minFilter)
          state.gl.texParameteri(target, state.gl.TEXTURE_MAG_FILTER, magFilter)
          state.gl.texParameteri(target, state.gl.TEXTURE_WRAP_S, wrapS)
          state.gl.texParameteri(target, state.gl.TEXTURE_WRAP_T, wrapT)

          textures.set(name, texture)
          return texture
        },
        get: () => {
          return textures.get(name)
        },
        bind: (unit = 0) => {
          const texture = textures.get(name)
          if (texture) {
            state.gl.activeTexture(state.gl.TEXTURE0 + unit)
            state.gl.bindTexture(target, texture)
          }
        },
        update: (x: number, y: number, width: number, height: number, data: ArrayBufferView) => {
          const texture = textures.get(name)
          if (texture) {
            state.gl.bindTexture(target, texture)
            state.gl.texSubImage2D(target, 0, x, y, width, height, format, type, data)
          }
        },
      }
    }),
  }

  // Initialize textures first (before framebuffers that depend on them)
  if (initialData?.textures) {
    for (const name in initialData.textures) {
      api.setters[name].set(initialData.textures[name])
    }
  }

  // Create textures that are defined in config but not in initialData
  if (config.textures) {
    for (const name in config.textures) {
      if (!textures.has(name)) {
        api.setters[name].set(null)
      }
    }
  }

  return api
}

/**********************************************************************************/
/*                                                                                */
/*                              Create Framebuffer Setters                        */
/*                                                                                */
/**********************************************************************************/

const FRAME_BUFFER_MAP = {
  color: 'COLOR_ATTACHMENT0',
  dept: 'DEPTH_ATTACHMENT',
  stencil: 'STENCIL_ATTACHMENT',
  depthStencil: 'DEPTH_STENCIL_ATTACHMENT',
}

function createAttachmentTexture(
  gl: GL,
  textureConfig: Omit<TextureOptions, 'data'>,
  name: string,
): WebGLTexture {
  const texture = gl.createTexture()
  if (!texture) throw new Error(`Failed to create texture for attachment: ${name}`)

  const target = getGLConstant(gl, textureConfig.target, 'TEXTURE_2D')
  const internalFormat = getGLConstant(gl, textureConfig.internalFormat, 'RGBA')
  const format = getGLConstant(gl, textureConfig.format, 'RGBA')
  const type = getGLConstant(gl, textureConfig.type, 'UNSIGNED_BYTE')
  const minFilter = getGLConstant(gl, textureConfig.minFilter, 'NEAREST')
  const magFilter = getGLConstant(gl, textureConfig.magFilter, 'NEAREST')
  const wrapS = getGLConstant(gl, textureConfig.wrapS, 'CLAMP_TO_EDGE')
  const wrapT = getGLConstant(gl, textureConfig.wrapT, 'CLAMP_TO_EDGE')

  gl.bindTexture(target, texture)
  gl.texImage2D(
    target,
    0,
    internalFormat,
    textureConfig.width,
    textureConfig.height,
    0,
    format,
    type,
    null,
  )

  // Set texture parameters
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)

  return texture
}

function createFramebufferSetters<T extends ProgramConfig>(
  state: ProgramState,
  config: T,
): { dispose(): void; setters: InferFramebuffers<T['framebuffers']> } | undefined {
  if (!config.framebuffers) return undefined
  const framebuffers = new Map()
  const framebufferTextures = new Map()

  // Initialize framebuffers with their own textures
  if (config.framebuffers) {
    for (const [name, framebufferConfig] of Object.entries(config.framebuffers)) {
      // Create framebuffer
      const framebuffer = state.gl.createFramebuffer()
      if (!framebuffer) throw new Error(`Failed to create framebuffer: ${name}`)

      framebuffers.set(name, framebuffer)
      state.gl.bindFramebuffer(state.gl.FRAMEBUFFER, framebuffer)

      // Create texture for the framebuffer
      const texture = createAttachmentTexture(state.gl, framebufferConfig, name)
      framebufferTextures.set(name, texture)

      // Determine attachment point based on attachment type
      const attachment = FRAME_BUFFER_MAP[framebufferConfig.attachment]

      state.gl.framebufferTexture2D(
        state.gl.FRAMEBUFFER,
        attachment,
        state.gl.TEXTURE_2D,
        texture,
        0,
      )

      // Check framebuffer completeness
      const status = state.gl.checkFramebufferStatus(state.gl.FRAMEBUFFER)
      if (status !== state.gl.FRAMEBUFFER_COMPLETE) {
        let errorMessage = `Framebuffer '${name}' not complete. Status: `
        switch (status) {
          case state.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            errorMessage += 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT'
            break
          case state.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            errorMessage += 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT'
            break
          case state.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            errorMessage += 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS'
            break
          case state.gl.FRAMEBUFFER_UNSUPPORTED:
            errorMessage += 'FRAMEBUFFER_UNSUPPORTED'
            break
          default:
            errorMessage += `Unknown (${status})`
        }
        throw new Error(errorMessage)
      }
    }

    // Restore default framebuffer
    state.gl.bindFramebuffer(state.gl.FRAMEBUFFER, null)
  }

  return {
    dispose() {
      // Clean up managed framebuffers
      for (const framebuffer of framebuffers.values()) {
        state.gl.deleteFramebuffer(framebuffer)
      }
      framebuffers.clear()

      // Clean up framebuffer textures
      for (const texture of framebufferTextures.values()) {
        state.gl.deleteTexture(texture)
      }
      framebufferTextures.clear()
    },
    setters: mapObject(config.framebuffers, (_, name) => {
      return {
        bind() {
          const framebuffer = framebuffers.get(name)
          if (framebuffer) {
            state.gl.bindFramebuffer(state.gl.FRAMEBUFFER, framebuffer)
          }
        },
        unbind() {
          state.gl.bindFramebuffer(state.gl.FRAMEBUFFER, null)
        },
        get() {
          return framebuffers.get(name)
        },
        getTexture() {
          return framebufferTextures.get(name)
        },
        checkStatus() {
          const framebuffer = framebuffers.get(name)
          if (framebuffer) {
            state.gl.bindFramebuffer(state.gl.FRAMEBUFFER, framebuffer)
            const status = state.gl.checkFramebufferStatus(state.gl.FRAMEBUFFER)
            return status === state.gl.FRAMEBUFFER_COMPLETE
          }
          return false
        },
      }
    }),
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                     Utils                                    */
/*                                                                                */
/**********************************************************************************/

// Helper to create buffers
export function createBuffer(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  data: Float32Array | Uint16Array | Uint32Array,
  target: number = WebGLRenderingContext.ARRAY_BUFFER,
  usage: number = WebGLRenderingContext.STATIC_DRAW,
): WebGLBuffer {
  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Failed to create buffer')

  gl.bindBuffer(target, buffer)
  gl.bufferData(target, data, usage)
  gl.bindBuffer(target, null)

  return buffer
}

// Helper to convert string constants to GL values
function getGLConstant(gl: GL, name: string | undefined, fallback: string): number {
  name ??= fallback
  if (!(name in gl)) {
    throw new Error(`Attempted to create webgl2-only texture (${name}) in webgl1`)
  }
  return gl[name]
}

const p = createProgram({ vertex: '', fragment: '', gl: null! }, { uniforms: { test: '2f' } })
p.uniforms.test.set(1, 2)
