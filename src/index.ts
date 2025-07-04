import { assertedNotNullish, mapObject } from '@rg/util'
import type {
  AttributeKind,
  AttributeMethods,
  AttributeOptions,
  AttributeSchema,
  BufferMethods,
  BufferOptions,
  BufferSchema,
  FramebufferMethods,
  FramebufferOptions,
  FramebufferSchema,
  GL,
  InferAttributeView,
  InferBuffers,
  InferFramebuffers,
  InferInterleavedAttributes,
  InferUniforms as InferUniformView,
  InterleavedAttributeMethods,
  InterleavedAttributeOptions,
  InterleavedAttributeSchema,
  TextureOptions,
  UniformKind,
  UniformMethods,
  UniformSchema,
  View,
  ViewSchema,
} from './types.ts'

function mapObject<T extends Record<string, any>, TReturn>(
  value: T,
  callback: (value: T[keyof T], key: keyof T, index: number) => TReturn,
): { [TKey in keyof T]: TReturn } {
  return Object.fromEntries(
    Object.entries(value).map(([key, value], index) => [
      key,
      callback(value, key as keyof T, index),
    ]),
  )
}

function assertedNotNullish<T>(value: T, message?: string): NonNullable<T> {
  if (value === undefined || value === null) throw new Error(message)
  return value
}

/**********************************************************************************/
/*                                                                                */
/*                                    Constants                                   */
/*                                                                                */
/**********************************************************************************/

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

const FRAMEBUFFER_ATTACHMENT_MAP = {
  color: 'COLOR_ATTACHMENT0',
  depth: 'DEPTH_ATTACHMENT',
  stencil: 'STENCIL_ATTACHMENT',
  depthStencil: 'DEPTH_STENCIL_ATTACHMENT',
} as const

const GL_INSTANCED_ARRAYS_EXTENSION = new WeakMap<GL, ANGLE_instanced_arrays>()

function getInstancedArraysExtension(gl: WebGLRenderingContext) {
  let extension = GL_INSTANCED_ARRAYS_EXTENSION.get(gl)
  if (!extension) {
    extension = assertedNotNullish(gl.getExtension('ANGLE_instanced_arrays'))
    GL_INSTANCED_ARRAYS_EXTENSION.set(gl, extension)
  }
  return extension
}

/**********************************************************************************/
/*                                                                                */
/*                                      View                                      */
/*                                                                                */
/**********************************************************************************/

export function view<T extends ViewSchema>(gl: GL, program: WebGLProgram, config: T): View<T> {
  const uniforms = uniformView(gl, program, config.uniforms ?? {})
  const [attributes, disposeAttributes] = attributeView(gl, program, config.attributes ?? {})
  const [interleavedAttributes, disposeInterleavedAttributes] = interleavedAttributeView(
    gl,
    program,
    config.interleavedAttributes ?? {},
  )
  const [buffers, disposeBuffers] = bufferView(gl, config.buffers ?? {})
  const [framebuffers, disposeFramebuffers] = framebufferView(gl, config.framebuffers ?? {})

  return [
    { uniforms, attributes, interleavedAttributes, buffers, framebuffers },
    function dispose() {
      disposeAttributes?.()
      disposeInterleavedAttributes?.()
      disposeBuffers?.()
      disposeFramebuffers?.()
    },
  ] as View<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                    Uniform View                                */
/*                                                                                */
/**********************************************************************************/

function createUniformMethods<TKind extends UniformKind>(
  gl: GL,
  program: WebGLProgram,
  name: string,
  kind: TKind,
): UniformMethods<TKind> {
  const location = assertedNotNullish(gl.getUniformLocation(program, name))
  return {
    set(...args: any[]) {
      switch (kind) {
        case 'mat3':
          gl.uniformMatrix3fv(location, false, args[0])
          break
        case 'mat4':
          gl.uniformMatrix4fv(location, false, args[0])
          break
        default:
          // @ts-expect-error
          gl[`uniform${kind}`](location, ...args)
      }
    },
  }
}

export function uniformView<T extends UniformSchema>(gl: GL, program: WebGLProgram, config: T) {
  return mapObject(config, (options, name) =>
    createUniformMethods(gl, program, name as string, options),
  ) as InferUniformView<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                   Attribute View                               */
/*                                                                                */
/**********************************************************************************/

// Shared attribute helper functions
function handleAttribute(
  gl: GL,
  location: number,
  size: number,
  stride: number,
  offset: number,
  kind: AttributeKind,
  instanced?: boolean,
) {
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(
    location,
    size,
    gl[kind.endsWith('i') ? 'INT' : 'FLOAT'],
    false,
    stride,
    offset,
  )

  if (instanced) {
    if (gl instanceof WebGL2RenderingContext) {
      gl.vertexAttribDivisor(location, 1)
    } else {
      getInstancedArraysExtension(gl).vertexAttribDivisorANGLE(location, 1)
    }
  }
}

function createAttributeMethods(
  gl: GL,
  program: WebGLProgram,
  name: string,
  { kind, instanced }: AttributeOptions,
): AttributeMethods {
  const location = gl.getAttribLocation(program, name)
  if (location < 0) {
    throw new Error(`Attribute '${name}' not found`)
  }

  const buffer = assertedNotNullish(gl.createBuffer())
  const size = SIZE_MAP[kind]

  return {
    dispose() {
      gl.deleteBuffer(buffer)
    },
    bind() {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      handleAttribute(gl, location, size, 0, 0, kind, instanced)
    },
    set(data, usage = 'STATIC_DRAW') {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl[usage])
      return this
    },
  }
}

function attributeView<T extends AttributeSchema>(gl: GL, program: WebGLProgram, config: T) {
  const attributes = mapObject(config, (options, name) =>
    createAttributeMethods(gl, program, name as string, options),
  )

  return [
    attributes,
    function dispose() {
      for (const name in attributes) {
        attributes[name].dispose()
      }
    },
  ] as InferAttributeView<T>
}

/**********************************************************************************/
/*                                                                                */
/*                              Create Interleaved Attributes                    */
/*                                                                                */
/**********************************************************************************/

function createInterleavedAttributeMethods(
  gl: GL,
  program: WebGLProgram,
  { layout, instanced }: InterleavedAttributeOptions,
): InterleavedAttributeMethods {
  // Increment number to keep track of offset
  let offset = 0

  // Calculate layout information
  const schema = layout.map(layout => {
    const location = gl.getAttribLocation(program, layout.name)

    if (location < 0) {
      throw new Error(`Attribute '${layout.name}' not found`)
    }

    const size = SIZE_MAP[layout.kind]
    const result = {
      size,
      location,
      offset,
      kind: layout.kind,
    }

    offset += size * 4

    return result
  })

  // Set stride to final offset
  const stride = offset

  // Create a buffer
  const buffer = assertedNotNullish(gl.createBuffer())

  // Create VAO for WebGL2 to cache attribute state
  let vao: { bind(): void; dispose(): void } | undefined = undefined

  if (gl instanceof WebGL2RenderingContext) {
    const vertexArray = gl.createVertexArray()
    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    handleLayoutAttributes()
    gl.bindVertexArray(null)
    vao = {
      bind() {
        gl.bindVertexArray(vertexArray)
      },
      dispose() {
        gl.deleteVertexArray(vertexArray)
      },
    }
  }

  function handleLayoutAttributes() {
    for (const { size, location, offset, kind } of schema) {
      handleAttribute(gl, location, size, stride, offset, kind, instanced)
    }
  }

  return {
    dispose() {
      gl.deleteBuffer(buffer)
      if (vao) {
        vao.dispose()
      }
    },
    bind() {
      if (vao) {
        vao.bind()
      } else {
        // Fallback: manual attribute setup
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        handleLayoutAttributes()
      }
    },
    set(value, usage = 'STATIC_DRAW') {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage])
      return this
    },
  }
}

export function interleavedAttributeView<T extends InterleavedAttributeSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
) {
  // Initialize interleaved attributes
  const interleavedAttributes = mapObject(schema, options =>
    createInterleavedAttributeMethods(gl, program, options),
  )

  return [
    interleavedAttributes,
    function dispose() {
      for (const name in interleavedAttributes) {
        interleavedAttributes[name].dispose()
      }
    },
  ] as InferInterleavedAttributes<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                    Create Buffers                              */
/*                                                                                */
/**********************************************************************************/

function createBufferMethods(
  gl: GL,
  { target = 'ARRAY_BUFFER', usage = 'STATIC_DRAW' }: BufferOptions,
): BufferMethods {
  const buffer = assertedNotNullish(gl.createBuffer())
  return {
    bind() {
      gl.bindBuffer(gl[target], buffer)
    },
    set(data) {
      gl.bindBuffer(gl[target], buffer)
      gl.bufferData(gl[target], data, gl[usage])
      return this
    },
    dispose() {
      gl.deleteBuffer(buffer)
    },
  }
}

export function bufferView<T extends BufferSchema>(gl: GL, config: T) {
  // Initialize buffers
  const buffers = mapObject(config, options => createBufferMethods(gl, options))

  return [
    buffers,
    function dispose() {
      for (const name in buffers) {
        buffers[name].dispose()
      }
    },
  ] as InferBuffers<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                Create Framebuffers                             */
/*                                                                                */
/**********************************************************************************/

class FramebufferError extends Error {
  constructor(gl: GL, name: string, status: number) {
    let errorMessage = `Framebuffer '${name}' not complete. Status: `
    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        errorMessage += 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT'
        break
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        errorMessage += 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT'
        break
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        errorMessage += 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS'
        break
      case gl.FRAMEBUFFER_UNSUPPORTED:
        errorMessage += 'FRAMEBUFFER_UNSUPPORTED'
        break
      default:
        errorMessage += `Unknown (${status})`
    }
    super(errorMessage)
  }
}

export function createTexture(
  gl: GL,
  {
    target = 'TEXTURE_2D',
    internalFormat = 'RGBA',
    format = 'RGBA',
    type = 'UNSIGNED_BYTE',
    minFilter = 'NEAREST',
    magFilter = 'NEAREST',
    wrapS = 'CLAMP_TO_EDGE',
    wrapT = 'CLAMP_TO_EDGE',
    width,
    height,
  }: TextureOptions,
  data?: ArrayBufferView | null,
): WebGLTexture {
  const texture = gl.createTexture()

  function getTextureConstant(name: string) {
    if (!(name in gl)) {
      throw new Error(`Attempted to create webgl2-only texture (${name}) in webgl1`)
    }
    return gl[name]
  }

  gl.bindTexture(gl[target], texture)
  gl.texImage2D(
    gl[target],
    0,
    getTextureConstant(internalFormat),
    width,
    height,
    0,
    getTextureConstant(format),
    getTextureConstant(type),
    data ?? data ?? null,
  )

  // Set texture parameters
  gl.texParameteri(gl[target], gl.TEXTURE_MIN_FILTER, gl[minFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_MAG_FILTER, gl[magFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_S, gl[wrapS])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_T, gl[wrapT])

  return texture
}

function createFrameBufferMethods(
  gl: GL,
  name: string,
  { attachment, ...options }: FramebufferOptions,
): FramebufferMethods {
  // Create framebuffer
  const framebuffer = assertedNotNullish(
    gl.createFramebuffer(),
    `Failed to create framebuffer: ${name}`,
  )

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

  let texture: WebGLTexture
  try {
    // Create texture for the framebuffer
    texture = createTexture(gl, options)
  } catch {
    throw new Error(`Failed to create texture: ${name}`)
  }

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    // Determine attachment point based on attachment kind
    gl[FRAMEBUFFER_ATTACHMENT_MAP[attachment]],
    gl.TEXTURE_2D,
    texture,
    0,
  )

  // Check framebuffer completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new FramebufferError(gl, name, status)
  }

  return {
    dispose() {
      gl.deleteFramebuffer(framebuffer)
      gl.deleteTexture(texture)
    },
    bind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    },
  }
}

export function framebufferView<T extends FramebufferSchema>(gl: GL, config: T) {
  if (!config) return [] as InferFramebuffers<T>

  // Initialize framebuffers
  const framebuffers = mapObject(config, (options, name) =>
    createFrameBufferMethods(gl, name as string, options),
  )

  // Restore default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return [
    framebuffers,
    function dispose() {
      for (const name in framebuffers) {
        framebuffers[name].dispose()
      }
    },
  ] as InferFramebuffers<T>
}
