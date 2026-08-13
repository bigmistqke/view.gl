import { getInstancedArrays, getVertexArrayObject } from './gl'
import type {
  AttributeFormat,
  AttributeKind,
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
  isSamplerKind,
  kindToUniformFnName,
  isMatKind,
  assertedNotNullish,
  kindToSize,
  forEachObject,
} from './utils'
import { createUpsertMap, mapObject } from './utils'
export * from './types'

/**********************************************************************************/
/*                                                                                */
/*                                      To ID                                     */
/*                                                                                */
/**********************************************************************************/

let index = 0
const PREFIX = 'VIEW_GL_ALIAS'
// Firefox has currently a bug where it can not handle symbol as WeakRef / key for WeakMap
// see https://bugzilla.mozilla.org/show_bug.cgi?id=1710433
const HAS_WEAK_SYMBOL = (() => {
  try {
    const symbol = Symbol()
    new WeakMap().set(symbol, '')
    return true
  } catch {
    return false
  }
})()
// NOTE:  fallback to Map will currently cause a minor memory leak.
const SYMBOL_MAP = createUpsertMap(HAS_WEAK_SYMBOL ? WeakMap<symbol, string> : Map<symbol, string>)

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
  // @ts-expect-error - conditional return type based on size is hard to infer
  return mapObject(schema, ({ kind, size }, key) => {
    const name = toID(key)

    if (isSamplerKind(kind)) {
      const location = gl.getUniformLocation(program, name)
      return {
        set(arg: number) {
          gl.uniform1i(location, arg)
        },
      }
    }

    // Array uniform - support both bulk set and indexed access
    if (size) {
      const bulkFnName = `uniform${kindToUniformFnName(kind)}v`
      // @ts-ignore FIX WEBGL/WEBGL2 TYPES
      const bulkFn = gl[bulkFnName].bind(gl)
      const bulkLocation = gl.getUniformLocation(program, name)

      const elementFnName = `uniform${kindToUniformFnName(kind)}`
      // @ts-ignore FIX WEBGL/WEBGL2 TYPES
      const elementFn = gl[elementFnName].bind(gl)

      // Build array of element setters
      const elements: Array<{ set(...args: any[]): void }> = []
      for (let i = 0; i < size; i++) {
        const location = gl.getUniformLocation(program, `${name}[${i}]`)
        elements[i] = {
          set(...args: any[]) {
            elementFn(location, ...args)
          },
        }
      }

      // Return array-like object with bulk set
      return Object.assign(elements, {
        set(arg: Float32Array) {
          bulkFn(bulkLocation, arg)
        },
      })
    }

    // Non-array uniform
    const location = gl.getUniformLocation(program, name)
    const fnName = `uniform${kindToUniformFnName(kind)}`

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

type GLType =
  | 'FLOAT'
  | 'INT'
  | 'UNSIGNED_INT'
  | 'SHORT'
  | 'UNSIGNED_SHORT'
  | 'BYTE'
  | 'UNSIGNED_BYTE'

const FORMAT_TO_GL_TYPE: Record<AttributeFormat, GLType> = {
  float32: 'FLOAT',
  int32: 'INT',
  uint32: 'UNSIGNED_INT',
  int16: 'SHORT',
  uint16: 'UNSIGNED_SHORT',
  int8: 'BYTE',
  uint8: 'UNSIGNED_BYTE',
}

const FORMAT_BYTE_SIZE: Record<AttributeFormat, number> = {
  float32: 4,
  int32: 4,
  uint32: 4,
  int16: 2,
  uint16: 2,
  int8: 1,
  uint8: 1,
}

function defaultFormat(kind: AttributeKind): AttributeFormat {
  if (kind.startsWith('u')) return 'uint32'
  if (kind.startsWith('i')) return 'int32'
  return 'float32'
}

// Shared attribute helper functions
// between attributeView and interleavedAttributeView
function handleAttribute(
  gl: GL,
  location: number,
  size: number,
  stride: number,
  offset: number,
  glType: GLType,
  isIntegerKind: boolean,
  normalized: boolean,
  instanced?: boolean,
) {
  gl.enableVertexAttribArray(location)
  if (isIntegerKind) {
    ;(gl as WebGL2RenderingContext).vertexAttribIPointer(location, size, gl[glType], stride, offset)
  } else {
    gl.vertexAttribPointer(location, size, gl[glType], normalized, stride, offset)
  }

  // Always stated, never inherited: the divisor belongs to the location rather
  // than to the program, so a location left at 1 by an earlier instanced
  // attribute would feed one value to every vertex here.
  // Get instanced-arrays-feature: extension if webgl, gl if webgl2
  const instancedArrays = getInstancedArrays(gl)
  if (instanced) {
    assertedNotNullish(instancedArrays).vertexAttribDivisor(location, 1)
  } else if (instancedArrays) {
    instancedArrays.vertexAttribDivisor(location, 0)
  }
}

// Same enum in webgl2 and in the webgl1 extensions, which expose no constants
const VERTEX_ATTRIB_ARRAY_DIVISOR = 0x88fe
const VERTEX_ARRAY_BINDING = 0x85b5

// Reads the divisor currently attached to a location, 0 where instancing is
// unavailable and nothing can have set one
function readDivisor(gl: GL, location: number): number {
  return getInstancedArrays(gl)
    ? (gl.getVertexAttrib(location, VERTEX_ATTRIB_ARRAY_DIVISOR) as number)
    : 0
}

// Wraps a restore so it runs once: a disposer is per bind() and undoing twice
// would put back state a later bind() is relying on
function once(restore: () => void): () => void {
  let done = false
  return () => {
    if (done) return
    done = true
    restore()
  }
}

export function attributeView<T extends AttributeSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
  { signal }: ViewOptions = {},
): AttributeView<T> {
  const attributes = mapObject(
    schema,
    (
      {
        kind,
        format,
        normalized = false,
        instanced,
        buffer = assertedNotNullish(gl.createBuffer()),
      },
      key,
    ): AttributeMethods => {
      const name = toID(key)

      const location = gl.getAttribLocation(program, name)
      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`)
      }

      const size = kindToSize(kind)
      const resolvedFormat = format ?? defaultFormat(kind)
      const glType = FORMAT_TO_GL_TYPE[resolvedFormat]
      const isIntKind = kind.startsWith('i') || kind.startsWith('u')

      return {
        buffer,
        bind() {
          // Snapshot before the change, restore in the disposer
          const previousDivisor = readDivisor(gl, location)
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          handleAttribute(gl, location, size, 0, 0, glType, isIntKind, normalized, instanced)
          return once(() => {
            getInstancedArrays(gl)?.vertexAttribDivisor(location, previousDivisor)
          })
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
    forEachObject(attributes, value => value.dispose())
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
  const interleavedAttributes = mapObject(schema, ({ layout, instanced }) => {
    // Increment number to keep track of offset
    let index = 0

    // Calculate layout information
    const locations: number[] = []
    const handles = layout.map(layout => {
      const name = toID(layout.key)

      const location = gl.getAttribLocation(program, name)

      if (location < 0) {
        throw new Error(`Attribute '${name}' not found`)
      }

      locations.push(location)

      const size = kindToSize(layout.kind)
      const offset = index
      const resolvedFormat = layout.format ?? defaultFormat(layout.kind)
      const glType = FORMAT_TO_GL_TYPE[resolvedFormat]
      const isIntKind = layout.kind.startsWith('i') || layout.kind.startsWith('u')
      const normalized = layout.normalized ?? false
      index += size * FORMAT_BYTE_SIZE[resolvedFormat]

      return () =>
        handleAttribute(
          gl,
          location,
          size,
          stride,
          offset,
          glType,
          isIntKind,
          normalized,
          instanced,
        )
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

    // A selected vertex array stays selected for every later draw, which would
    // then write its own attributes into this one
    const unbind = () => {
      if (vao) {
        vao.unbind()
      }
    }

    return {
      bind() {
        // Snapshot before the change, restore in the disposer
        const previousVertexArray = feature
          ? (gl.getParameter(VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null)
          : null
        const previousDivisors = vao
          ? []
          : locations.map(location => [location, readDivisor(gl, location)] as const)

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        if (vao) {
          vao.bind()
        } else {
          // Fallback: manual attribute setup
          for (const handle of handles) {
            handle()
          }
        }

        return once(() => {
          if (feature) {
            feature.bindVertexArray(previousVertexArray)
          }
          // Without a vertex array the manual setup wrote divisors straight to
          // the locations, so they are ours to put back
          if (!vao) {
            const instancedArrays = getInstancedArrays(gl)
            previousDivisors.forEach(([location, divisor]) => {
              instancedArrays?.vertexAttribDivisor(location, divisor)
            })
          }
        })
      },
      unbind,
      dispose() {
        gl.deleteBuffer(buffer)
        if (vao) {
          vao.dispose()
        }
      },
      set(value, usage = 'STATIC_DRAW') {
        if (vao) {
          vao.bind()
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage])
        if (vao) {
          vao.unbind()
        }
      },
    } satisfies InterleavedAttributeMethods
  })

  signal?.addEventListener('abort', function dispose() {
    forEachObject(interleavedAttributes, value => value.dispose())
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
  const buffers = mapObject(schema, ({ target = 'ARRAY_BUFFER', usage = 'STATIC_DRAW' }) => {
    const buffer = assertedNotNullish(gl.createBuffer())

    return {
      bind() {
        // Snapshot before the change, restore in the disposer. Restoring the
        // previous buffer rather than null matters for ELEMENT_ARRAY_BUFFER,
        // whose binding is recorded in the bound vertex array: clearing it
        // would strip the index buffer from an array the caller may not own.
        const previousBuffer = gl.getParameter(gl[`${target}_BINDING`]) as WebGLBuffer | null
        gl.bindBuffer(gl[target], buffer)
        return once(() => {
          gl.bindBuffer(gl[target], previousBuffer)
        })
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
    forEachObject(buffers, value => value.dispose())
  })

  return buffers
}
