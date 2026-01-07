import { getInstancedArrays, getVertexArrayObject } from './features'
import type {
  AttributeMethods,
  AttributeSchema,
  AttributeView,
  BufferSchema,
  BufferView,
  GL,
  UniformView as InferUniformView,
  InterleavedAttributeMethods,
  InterleavedAttributeSchema,
  InterleavedAttributeView,
  UniformSchema,
  View,
  ViewOptions,
  ViewSchema,
} from './types'
import {
  assertedNotNullish,
  createUpsertMap,
  isMatKind,
  isSamplerKind,
  kindToSize,
  kindToUniformFnName,
} from './utils'
export * from './types'
import * as ObjectUtils from "./utils/object"

/**********************************************************************************/
/*                                                                                */
/*                                      To ID                                     */
/*                                                                                */
/**********************************************************************************/

let index = 0
const PREFIX = 'VIEW_GL_ALIAS'
const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0

// NOTE:  using symbol as key for WeakMap is currently broken in firefox
//        see https://bugzilla.mozilla.org/show_bug.cgi?id=1710433
//        fallback to Map will currently cause a memory leak.
const SYMBOL_MAP = createUpsertMap(IS_FIREFOX ? Map<symbol, string> : WeakMap<symbol, string>)

export function toID(key: string | number | symbol) {
  if (typeof key === 'string') {
    return key
  }
  if (typeof key === 'symbol') {
    return SYMBOL_MAP.getOrInsert(key, () => `${PREFIX}_${index++}`)
  }
  return key.toString()
}

/**********************************************************************************/
/*                                                                                */
/*                                      View                                      */
/*                                                                                */
/**********************************************************************************/

export function view<TSchema extends ViewSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: TSchema,
  options?: ViewOptions,
): View<TSchema> {
  return {
    uniforms: !schema.uniforms ? undefined : uniformView(gl, program, schema.uniforms),
    attributes: !schema.attributes
      ? undefined
      : attributeView(gl, program, schema.attributes, options),
    interleavedAttributes: !schema.interleavedAttributes
      ? undefined
      : interleavedAttributeView(gl, program, schema.interleavedAttributes, options),
    buffers: !schema.buffers ? undefined : bufferView(gl, schema.buffers),
  } as View<TSchema>
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
  return ObjectUtils.map(schema, ({ kind, size }, key) => {
    const name = toID(key)

    const location = gl.getUniformLocation(program, name)

    if (isSamplerKind(kind)) {
      return {
        set(arg: number) {
          gl.uniform1i(location, arg)
        },
      }
    }

    const fnName = `uniform${kindToUniformFnName(kind)}${size ? 'v' : ''}`

    // @ts-ignore FIX WEBGL/WEBGL2 TYPES
    const fn = gl[fnName].bind(gl)

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
  { signal }: ViewOptions = {},
): AttributeView<T> {
  const attributes = ObjectUtils.map(
    schema,
    (
      { kind, instanced, buffer = assertedNotNullish(gl.createBuffer()) },
      key,
    ): AttributeMethods => {
      const name = toID(key)

      const location = gl.getAttribLocation(program, name)
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`)
      }

      const size = kindToSize(kind)
      const type = kind.startsWith('i') ? 'INT' : 'FLOAT'

      return {
        buffer,
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
    },
  )

  signal?.addEventListener('abort', function dispose() {
    ObjectUtils.forEach(attributes, value => value.dispose())
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
  { signal }: ViewOptions = {},
): InterleavedAttributeView<T> {
  // Initialize interleaved attributes
  const interleavedAttributes = ObjectUtils.map(schema, ({ layout, instanced }) => {
    // Increment number to keep track of offset
    let index = 0

    // Calculate layout information
    const handles = layout.map(layout => {
      const name = toID(layout.key)

      const location = gl.getAttribLocation(program, name)

      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`)
      }

      const size = kindToSize(layout.kind)
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
    let vao: { unbind(): void; bind(): void; dispose(): void } | undefined = undefined

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
        unbind() {
          feature.bindVertexArray(null)
        },
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
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        if (vao) {
          vao.bind()
        } else {
          // Fallback: manual attribute setup
          for (const handle of handles) {
            handle()
          }
        }
      },
      unbind() {
        if (vao) {
          vao.unbind()
        }
      },
      dispose() {
        gl.deleteBuffer(buffer)
        if (vao) {
          vao.dispose()
        }
      },
      set(value, usage = 'STATIC_DRAW') {
        if (vao) {
          vao.bind()
        } else {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        }
        gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage])
        if (vao) {
          vao.unbind()
        }
      },
    } satisfies InterleavedAttributeMethods
  })

  signal?.addEventListener('abort', function dispose() {
    ObjectUtils.forEach(interleavedAttributes, value => value.dispose())
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
  { signal }: ViewOptions = {},
): BufferView<T> {
  // Initialize buffers
  const buffers = ObjectUtils.map(schema, ({ target = 'ARRAY_BUFFER', usage = 'STATIC_DRAW' }) => {
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
    ObjectUtils.forEach(buffers, value => value.dispose())
  })

  return buffers
}
