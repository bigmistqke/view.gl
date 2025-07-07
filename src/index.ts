import { FRAMEBUFFER_ATTACHMENT_MAP, KIND_SIZE_MAP, KIND_TO_UNIFORM_FN_NAME } from './constants'
import type {
  AttributeKind,
  AttributeMethods,
  AttributeSchema,
  AttributeView,
  BufferSchema,
  BufferView,
  FramebufferMethods,
  FramebufferSchema,
  FramebufferView,
  GL,
  UniformView as InferUniformView,
  InterleavedAttributeMethods,
  InterleavedAttributeSchema,
  InterleavedAttributeView,
  RemoveSuffix,
  TexImage2DOptions,
  TextureMethods,
  TextureParameters,
  TextureSchema,
  TextureView,
  UniformKind,
  UniformSchema,
  View,
  ViewSchema,
} from './types'
import { assertedNotNullish, createTexture, mapObject } from './utils'

const isMatKind = <
  T extends UniformKind | AttributeKind,
  TPrefix extends string,
  TPostfix extends string,
>(
  kind: T,
): kind is T & `${TPrefix}mat${TPostfix}` => kind.includes('mat')

const isSamplerKind = <TPrefix extends string, TPostfix extends string>(
  kind: UniformKind,
): kind is UniformKind & `${TPrefix}sampler${TPostfix}` => kind.includes('sampler')

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

export function view<T extends ViewSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
  signal?: AbortSignal,
): View<T> {
  return {
    uniforms: !schema.uniforms ? undefined : uniformView(gl, program, schema.uniforms),
    attributes: !schema.attributes
      ? undefined
      : attributeView(gl, program, schema.attributes, signal),
    interleavedAttributes: !schema.interleavedAttributes
      ? undefined
      : interleavedAttributeView(gl, program, schema.interleavedAttributes, signal),
    buffers: !schema.buffers ? undefined : bufferView(gl, schema.buffers),
    framebuffers: !schema.framebuffers
      ? undefined
      : framebufferView(gl, schema.framebuffers, signal),
    textures: !schema.textures ? undefined : textureView(gl, schema.textures, signal),
  } as View<T>
}

/**********************************************************************************/
/*                                                                                */
/*                                    Uniform View                                */
/*                                                                                */
/**********************************************************************************/

export function uniformView<T extends UniformSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
): InferUniformView<T> {
  return mapObject(schema, (kind: UniformKind, name) => {
    const location = assertedNotNullish(
      gl.getUniformLocation(program, name),
      `Could not find location of uniform: ${name}`,
    )

    if (isSamplerKind(kind)) {
      return {
        set(arg: number) {
          gl.uniform1i(location, arg)
        },
      }
    }

    // @ts-ignore FIX WEBGL/WEBGL2 TYPES
    const fn = gl[`uniform${KIND_TO_UNIFORM_FN_NAME[kind]}`].bind(gl)

    if (isMatKind(kind)) {
      return {
        set(...args: any[]) {
          fn(location, false, args[0])
        },
      }
    }

    return {
      set(...args: any[]) {
        fn(location, ...args)
      },
    }
  })
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
  type: 'FLOAT' | 'INT',
  instanced?: boolean,
) {
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl[type], false, stride, offset)

  if (instanced) {
    // Get instanced-arrays-feature: extension if webgl, gl if webgl2
    assertedNotNullish(getInstancedArrays(gl)).vertexAttribDivisor(location, 1)
  }
}

export function attributeView<T extends AttributeSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
  signal?: AbortSignal,
): AttributeView<T> {
  const attributes = mapObject(schema, ({ kind, instanced }, name): AttributeMethods => {
    const location = gl.getAttribLocation(program, name)
    if (location < 0) {
      throw new Error(`Attribute '${name}' not found`)
    }

    const buffer = assertedNotNullish(gl.createBuffer())
    const size = KIND_SIZE_MAP[kind]
    const type = kind.startsWith('i') ? 'INT' : 'FLOAT'

    return {
      bind() {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        handleAttribute(gl, location, size, 0, 0, type, instanced)
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

  signal?.addEventListener('abort', function dispose() {
    for (const name in attributes) {
      attributes[name].dispose()
    }
  })

  return attributes
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
  signal?: AbortSignal,
): InterleavedAttributeView<T> {
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

      const size = KIND_SIZE_MAP[layout.kind]
      const offset = index
      const type = layout.kind.startsWith('i') ? 'INT' : 'FLOAT'
      index += size * 4

      return () => handleAttribute(gl, location, size, stride, offset, type, instanced)
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
        bind() {
          feature.bindVertexArray(vertexArray)
        },
        dispose() {
          feature.deleteVertexArray(vertexArray)
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
    } satisfies InterleavedAttributeMethods
  })

  signal?.addEventListener('abort', function dispose() {
    for (const name in interleavedAttributes) {
      interleavedAttributes[name].dispose()
    }
  })

  return interleavedAttributes
}

/**********************************************************************************/
/*                                                                                */
/*                                     Buffer View                                */
/*                                                                                */
/**********************************************************************************/

export function bufferView<T extends BufferSchema>(
  gl: GL,
  schema: T,
  signal?: AbortSignal,
): BufferView<T> {
  // Initialize buffers
  const buffers = mapObject(schema, ({ target = 'ARRAY_BUFFER', usage = 'STATIC_DRAW' }) => {
    const buffer = assertedNotNullish(gl.createBuffer())
    return {
      bind() {
        gl.bindBuffer(gl[target], buffer)
      },
      dispose() {
        gl.deleteBuffer(buffer)
      },
      set(data: Float32Array) {
        gl.bindBuffer(gl[target], buffer)
        gl.bufferData(gl[target], data, gl[usage])
      },
    }
  })

  signal?.addEventListener('abort', function dispose() {
    for (const name in buffers) {
      buffers[name].dispose()
    }
  })

  return buffers
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

export function framebufferView<T extends FramebufferSchema>(
  gl: GL,
  schema: T,
  signal?: AbortSignal,
): FramebufferView<T> {
  // Initialize framebuffers
  const framebuffers = mapObject(schema, ({ attachment, ...options }, name) => {
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
    } satisfies FramebufferMethods
  })

  // Restore default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  signal?.addEventListener('abort', function dispose() {
    for (const name in framebuffers) {
      framebuffers[name].dispose()
    }
  })

  return framebuffers
}

/**********************************************************************************/
/*                                                                                */
/*                                  Texture View                                  */
/*                                                                                */
/**********************************************************************************/

export function textureView<T extends TextureSchema>(
  gl: GL,
  schema: T,
  signal?: AbortSignal,
): TextureView<T> {
  const textures = mapObject(schema, ({ target = 'TEXTURE_2D' }, name) => {
    const texture = assertedNotNullish(gl.createTexture(), `Failed to create texture '${name}'`)

    return {
      bind(unit = 0) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        // @ts-ignore FIX WEBGL/WEBGL2 TYPES
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
        // @ts-ignore FIX WEBGL/WEBGL2 TYPES
        gl.bindTexture(gl[target], texture)

        if (!source) {
          gl.texImage2D(
            // @ts-ignore FIX WEBGL/WEBGL2 TYPES
            gl[target],
            level,
            // @ts-ignore FIX WEBGL/WEBGL2 TYPES
            gl[internalFormat],
            width,
            height,
            border,
            gl[format],
            // @ts-ignore FIX WEBGL/WEBGL2 TYPES
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
          // @ts-ignore FIX WEBGL/WEBGL2 TYPES
          gl.texImage2D(gl[target], level, gl[internalFormat], gl[format], gl[type], source)
          return
        }

        throw new Error(`Unsupported image source for texture '${name}'`)
      },
      parameters(params: TextureParameters) {
        // @ts-ignore FIX WEBGL/WEBGL2 TYPES
        gl.bindTexture(gl[target], texture)
        for (const [propertyName, property] of Object.entries(params)) {
          // @ts-ignore FIX WEBGL/WEBGL2 TYPES
          gl.texParameteri(gl[target], gl[propertyName], gl[property])
        }
      },
    } satisfies TextureMethods
  })

  signal?.addEventListener('abort', function dispose() {
    for (const name in textures) {
      textures[name].dispose()
    }
  })

  return textures
}
