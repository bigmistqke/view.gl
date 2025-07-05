import type {
  AttributeKind,
  AttributeMethods,
  AttributeSchema,
  BufferSchema,
  FramebufferSchema,
  GL,
  InferAttributeView,
  InferBuffers,
  InferFramebuffers,
  InferInterleavedAttributes,
  InferTextures,
  InferUniforms as InferUniformView,
  InterleavedAttributeSchema,
  RemoveSuffix,
  TexImage2DOptions,
  TextureParameters,
  TextureSchema,
  UniformSchema,
  View,
  ViewSchema,
} from './types.ts'
import { createTexture } from './utils.js'

function mapObject<T extends Record<string, any>, TReturn>(
  value: T,
  callback: (value: T[keyof T], key: Extract<keyof T, string>, index: number) => TReturn,
): { [TKey in keyof T]: TReturn } {
  return Object.fromEntries(
    Object.entries(value).map(([key, value], index) => [key, callback(value, key, index)]),
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

/**********************************************************************************/
/*                                                                                */
/*                                       Features                                 */
/*                                                                                */
/**********************************************************************************/

const INSTANCED_ARRAYS_WRAPPER_MAP = new WeakMap<
  GL,
  RemoveSuffix<
    Pick<
      ANGLE_instanced_arrays,
      'drawArraysInstancedANGLE' | 'drawElementsInstancedANGLE' | 'vertexAttribDivisorANGLE'
    >,
    'ANGLE'
  > | null
>()
function getInstancedArrays(gl: GL) {
  if (gl instanceof WebGL2RenderingContext) return gl

  const cached = INSTANCED_ARRAYS_WRAPPER_MAP.get(gl)
  if (cached) return cached

  const ext = gl.getExtension('ANGLE_instanced_arrays')
  if (!ext) return undefined

  const wrapper = {
    drawArraysInstanced: ext.drawArraysInstancedANGLE.bind(ext),
    drawElementsInstanced: ext.drawElementsInstancedANGLE.bind(ext),
    vertexAttribDivisor: ext.vertexAttribDivisorANGLE.bind(ext),
  }
  INSTANCED_ARRAYS_WRAPPER_MAP.set(gl, wrapper)

  return wrapper
}

const VERTEX_ARRAY_OBJECT_WRAPPER_MAP = new WeakMap<
  GL,
  RemoveSuffix<
    Pick<
      OES_vertex_array_object,
      'bindVertexArrayOES' | 'createVertexArrayOES' | 'deleteVertexArrayOES'
    >,
    'OES'
  > | null
>()
function getVertexArrayObject(gl: GL) {
  if (gl instanceof WebGL2RenderingContext) return gl

  const cached = VERTEX_ARRAY_OBJECT_WRAPPER_MAP.get(gl)
  if (cached) return cached

  const ext = gl.getExtension('OES_vertex_array_object')
  if (!ext) return null

  const wrapper = {
    bindVertexArray: ext.bindVertexArrayOES.bind(ext),
    createVertexArray: ext.createVertexArrayOES.bind(ext),
    deleteVertexArray: ext.deleteVertexArrayOES.bind(ext),
  }
  VERTEX_ARRAY_OBJECT_WRAPPER_MAP.set(gl, wrapper)

  return wrapper
}

/**********************************************************************************/
/*                                                                                */
/*                                      View                                      */
/*                                                                                */
/**********************************************************************************/

export function view<T extends ViewSchema>(gl: GL, program: WebGLProgram, config: T): View<T> {
  const uniforms = !config.uniforms ? undefined : uniformView(gl, program, config.uniforms)
  const [attributes, disposeAttributes] = !config.attributes
    ? []
    : attributeView(gl, program, config.attributes)
  const [interleavedAttributes, disposeInterleavedAttributes] = !config.interleavedAttributes
    ? []
    : interleavedAttributeView(gl, program, config.interleavedAttributes)
  const [buffers, disposeBuffers] = !config.buffers ? [] : bufferView(gl, config.buffers)
  const [framebuffers, disposeFramebuffers] = !config.framebuffers
    ? []
    : framebufferView(gl, config.framebuffers)
  const [textures, disposeTextures] = !config.textures ? [] : textureView(gl, config.textures)

  return [
    { uniforms, attributes, interleavedAttributes, buffers, framebuffers, textures },
    function dispose() {
      disposeAttributes?.()
      disposeInterleavedAttributes?.()
      disposeBuffers?.()
      disposeFramebuffers?.()
      disposeTextures?.()
    },
  ] as View<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                    Uniform View                                */
/*                                                                                */
/**********************************************************************************/

export function uniformView<T extends UniformSchema>(gl: GL, program: WebGLProgram, config: T) {
  return mapObject(config, (kind, name) => {
    const location = assertedNotNullish(gl.getUniformLocation(program, name))
    return {
      set(...args: any[]) {
        if (kind.startsWith('mat')) {
          gl[`uniformMatrix${kind.replace('mat', '')}fv`](location, false, args[0])
        }
        if (kind.startsWith('sampler')) {
          gl.uniform1i(location, args[0])
        } else {
          // @ts-expect-error
          gl[`uniform${kind}`](location, ...args)
        }
      },
    }
  }) as InferUniformView<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                   Attribute View                               */
/*                                                                                */
/**********************************************************************************/

// Shared attribute helper functions
// between attributeView and interleavedAttributeView
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
    // Get instanced-arrays-feature: extension if webgl, gl if webgl2
    assertedNotNullish(getInstancedArrays(gl)).vertexAttribDivisor(location, 1)
  }
}

export function attributeView<T extends AttributeSchema>(gl: GL, program: WebGLProgram, config: T) {
  const attributes = mapObject(config, ({ kind, instanced }, name): AttributeMethods => {
    const location = gl.getAttribLocation(program, name)
    if (location < 0) {
      throw new Error(`Attribute '${name}' not found`)
    }

    const buffer = assertedNotNullish(gl.createBuffer())
    const size = SIZE_MAP[kind]

    return {
      bind() {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        handleAttribute(gl, location, size, 0, 0, kind, instanced)
      },
      dispose() {
        gl.deleteBuffer(buffer)
      },
      set(data, usage = 'STATIC_DRAW') {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl[usage])
        return this
      },
    }
  })

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
/*                               Interleaved Attribute View                       */
/*                                                                                */
/**********************************************************************************/

export function interleavedAttributeView<T extends InterleavedAttributeSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
) {
  // Initialize interleaved attributes
  const interleavedAttributes = mapObject(schema, ({ layout, instanced }) => {
    // Increment number to keep track of offset
    let index = 0

    // Calculate layout information
    const handles = layout.map(layout => {
      const location = gl.getAttribLocation(program, layout.name)

      if (location < 0) {
        throw new Error(`Attribute '${layout.name}' not found`)
      }

      const size = SIZE_MAP[layout.kind]
      const offset = index
      index += size * 4

      return () => handleAttribute(gl, location, size, stride, offset, layout.kind, instanced)
    })

    // Set stride to final index
    const stride = index

    // Create a buffer
    const buffer = assertedNotNullish(gl.createBuffer())

    // Create VAO to cache attribute state
    let vao: { bind(): void; dispose(): void } | undefined = undefined

    // Get VAO-feature: extension if webgl1, gl if webgl2
    const feature = getVertexArrayObject(gl)
    if (feature) {
      const vertexArray = feature.createVertexArray()
      feature.bindVertexArray(vertexArray)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      for (const handle of handles) {
        handle()
      }
      feature.bindVertexArray(null)
      vao = {
        dispose() {
          feature.deleteVertexArray(vertexArray)
        },
        bind() {
          feature.bindVertexArray(vertexArray)
        },
      }
    }

    return {
      bind() {
        if (vao) {
          vao.bind()
        } else {
          // Fallback: manual attribute setup
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          for (const handle of handles) {
            handle()
          }
        }
      },
      dispose() {
        gl.deleteBuffer(buffer)
        if (vao) {
          vao.dispose()
        }
      },
      set(value, usage = 'STATIC_DRAW') {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage])
      },
    }
  })

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
/*                                     Buffer View                                */
/*                                                                                */
/**********************************************************************************/

export function bufferView<T extends BufferSchema>(gl: GL, config: T) {
  // Initialize buffers
  const buffers = mapObject(config, ({ target = 'ARRAY_BUFFER', usage = 'STATIC_DRAW' }) => {
    const buffer = assertedNotNullish(gl.createBuffer())
    return {
      bind() {
        gl.bindBuffer(gl[target], buffer)
      },
      dispose() {
        gl.deleteBuffer(buffer)
      },
      set(data) {
        gl.bindBuffer(gl[target], buffer)
        gl.bufferData(gl[target], data, gl[usage])
      },
    }
  })

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
/*                                 Framebuffer View                               */
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

export function framebufferView<T extends FramebufferSchema>(gl: GL, config: T) {
  if (!config) return [] as InferFramebuffers<T>

  // Initialize framebuffers
  const framebuffers = mapObject(config, ({ attachment, ...options }, name) => {
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
      bind() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      },
      dispose() {
        gl.deleteFramebuffer(framebuffer)
        gl.deleteTexture(texture)
      },
    }
  })

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

/**********************************************************************************/
/*                                                                                */
/*                                  Texture View                                  */
/*                                                                                */
/**********************************************************************************/

export function textureView<T extends TextureSchema>(gl: GL, schema: T) {
  const textures = mapObject(schema, ({ target = 'TEXTURE_2D' }, name) => {
    const texture = assertedNotNullish(gl.createTexture(), `Failed to create texture '${name}'`)

    return {
      bind(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl[target], texture)
      },
      dispose() {
        gl.deleteTexture(texture)
      },
      set(
        source: ImageBufferSource | null,
        {
          level = 0,
          internalFormat = 'RGBA',
          width = 1,
          height = 1,
          border = 0,
          format = 'RGBA',
          type = 'UNSIGNED_BYTE',
        }: Partial<TexImage2DOptions> = {},
      ) {
        gl.bindTexture(gl[target], texture)

        if (!source) {
          gl.texImage2D(
            gl[target],
            level,
            gl[internalFormat],
            width,
            height,
            border,
            gl[format],
            gl[type],
            null,
          )
          return
        }

        if (
          source instanceof ImageBitmap ||
          source instanceof HTMLImageElement ||
          source instanceof HTMLCanvasElement ||
          source instanceof HTMLVideoElement
        ) {
          gl.texImage2D(gl[target], level, gl[internalFormat], gl[format], gl[type], source)
          return
        }

        throw new Error(`Unsupported image source for texture '${name}'`)
      },
      parameters(params: TextureParameters) {
        gl.bindTexture(gl[target], texture)
        for (const [pname, value] of Object.entries(params)) {
          gl.texParameteri(gl[target], gl[pname], gl[value])
        }
      },
    }
  })

  return [
    textures,
    function dispose() {
      for (const name in textures) {
        textures[name].dispose()
      }
    },
  ] as InferTextures<T>
}
