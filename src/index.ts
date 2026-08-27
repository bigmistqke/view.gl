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
  GLUsage,
  InterleavedAttributeLayout,
  InterleavedAttributeMethods,
  InterleavedAttributeSchema,
  InterleavedAttributeView,
  UniformSchema,
  VertexArrayMethods,
  VertexArrayParticipant,
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
    vao(participants: VertexArrayParticipant[]) {
      return vaoView(gl, participants, options)
    },
  } as View<TSchema>
}

/**********************************************************************************/
/*                                                                                */
/*                                    Vertex Array                                */
/*                                                                                */
/**********************************************************************************/

/**
 * Bind the default vertex array, returning a disposer that puts the previous
 * one back. The pointer calls name no destination, so anything applied without
 * a vertex array of its own has to say which one it means — and a vertex array
 * keeps what it is given, so writing into a caller's array by accident would
 * outlive the call that did it.
 */
function bindDefaultVertexArray(gl: GL): () => void {
  const feature = getVertexArrayObject(gl)
  if (!feature) {
    return () => {}
  }
  const previous = gl.getParameter(VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null
  feature.bindVertexArray(null)
  return () => feature.bindVertexArray(previous)
}

/**
 * A vertex array over the participants one draw needs.
 *
 * Where the context has vertex arrays, each participant writes itself in once,
 * here, and `bind()` is a single `bindVertexArray`. Where it does not — WebGL1
 * without `OES_vertex_array_object` — there is nowhere to keep the state, so
 * `bind()` re-applies every participant and the disposer puts back what they
 * displaced. Same contract, and the emulation is why the name still fits.
 */
export function vaoView(
  gl: GL,
  participants: VertexArrayParticipant[],
  { signal }: ViewOptions = {},
): VertexArrayMethods {
  const feature = getVertexArrayObject(gl)

  const methods: VertexArrayMethods = !feature
    ? {
        bind() {
          const restores = participants.map(participant => participant.applyToVertexArray())
          participants.forEach(participant => participant.applyToContext?.())
          return once(() => restores.forEach(restore => restore()))
        },
        unbind() {},
        dispose() {},
      }
    : (() => {
        const vertexArray = assertedNotNullish(feature.createVertexArray())
        const previous = gl.getParameter(VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null
        feature.bindVertexArray(vertexArray)
        // Discarding the restorers is the point: the state lives in this array
        // now, and the array is thrown away whole.
        for (const participant of participants) {
          participant.applyToVertexArray()
        }
        feature.bindVertexArray(previous)

        return {
          bind() {
            const previousVertexArray = gl.getParameter(
              VERTEX_ARRAY_BINDING,
            ) as WebGLVertexArrayObject | null
            feature.bindVertexArray(vertexArray)
            // Context state the array cannot hold — see applyToContext.
            participants.forEach(participant => participant.applyToContext?.())
            return once(() => feature.bindVertexArray(previousVertexArray))
          },
          unbind() {
            feature.bindVertexArray(null)
          },
          dispose() {
            feature.deleteVertexArray(vertexArray)
          },
        }
      })()

  signal?.addEventListener('abort', () => methods.dispose())

  return methods
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

      function applyToVertexArray() {
        // Snapshot before the change, restore in the disposer
        const previousDivisor = readDivisor(gl, location)
        // vertexAttribPointer captures whatever is bound to ARRAY_BUFFER when
        // it runs, so this binding is the setup for the pointer, not a lasting
        // part of the vertex array's state.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        handleAttribute(gl, location, size, 0, 0, glType, isIntKind, normalized, instanced)
        return once(() => {
          getInstancedArrays(gl)?.vertexAttribDivisor(location, previousDivisor)
        })
      }

      return {
        buffer,
        applyToVertexArray,
        bind() {
          const restoreVertexArray = bindDefaultVertexArray(gl)
          const restore = applyToVertexArray()
          return once(() => {
            restore()
            restoreVertexArray()
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

/**
 * The other place an attribute's value can come from: not a buffer, but the
 * context's current generic vertex attribute values, which an attribute reads
 * for every vertex when its array is disabled.
 *
 * A constant is a uniform in all but name — one value for the whole draw, set
 * by a function chosen from the kind — so it gets the setters a uniform gets,
 * off the same layout the buffer source uses.
 *
 * `vertexAttrib*` tops out at four floats and has no matrix form, so a layout
 * key that is fine in a buffer can be impossible as a constant. That is a hard
 * limit of the API rather than a choice, and it is worth saying so out loud at
 * the point someone reaches for it.
 */
function constantSource(gl: GL, layout: InterleavedAttributeLayout[], locations: number[]) {
  const setters = layout.map((entry, index) => {
    const size = kindToSize(entry.kind)
    const name = toID(entry.key)
    if (isMatKind(entry.kind) || size > 4) {
      throw new Error(
        `'${name}' is a ${entry.kind}, which cannot be a constant attribute: vertexAttrib* takes at most 4 floats and has no matrix form. Use the buffer source for it.`,
      )
    }
    // The values are context state, not vertex-array state, so they are held
    // here and written again on every bind — see applyToContext.
    let values: number[] = []
    const fn = gl[`vertexAttrib${size as 1 | 2 | 3 | 4}f`].bind(gl)
    return {
      name,
      location: locations[index]!,
      write: () => {
        if (values.length) {
          ;(fn as (location: number, ...args: number[]) => void)(locations[index]!, ...values)
        }
      },
      methods: {
        set(...args: number[]) {
          values = args
        },
      },
    }
  })

  return Object.assign(Object.fromEntries(setters.map(setter => [setter.name, setter.methods])), {
    applyToVertexArray() {
      const restores = setters.map(({ location }) => {
        const wasEnabled = gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED) as boolean
        gl.disableVertexAttribArray(location)
        return () => (wasEnabled ? gl.enableVertexAttribArray(location) : undefined)
      })
      return once(() => restores.forEach(restore => restore()))
    },
    applyToContext() {
      setters.forEach(setter => setter.write())
    },
    bind() {
      const restoreVertexArray = bindDefaultVertexArray(gl)
      const restore = this.applyToVertexArray()
      this.applyToContext()
      return once(() => {
        restore()
        restoreVertexArray()
      })
    },
  })
}

export function interleavedAttributeView<T extends InterleavedAttributeSchema>(
  gl: GL,
  program: WebGLProgram,
  schema: T,
  { signal }: ViewOptions = {},
): InterleavedAttributeView<T> {
  // Initialize interleaved attributes
  const interleavedAttributes = mapObject(schema, ({ layout }) => {
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

      return (divisor: 0 | 1) =>
        handleAttribute(
          gl,
          location,
          size,
          stride,
          offset,
          glType,
          isIntKind,
          normalized,
          divisor === 1,
        )
    })

    // Set stride to final index
    const stride = index

    // Create a buffer
    const buffer = assertedNotNullish(gl.createBuffer())

    // This layout used to create a vertex array of its own, here, which is why
    // the other participants in a draw had to be bound after it to be included
    // — the array they landed in was whichever one happened to be current.
    // Arrays are `vao()`'s job now; a layout is a layout and a buffer.
    function applyToVertexArray(divisor: 0 | 1) {
      const previousDivisors = locations.map(
        location => [location, readDivisor(gl, location)] as const,
      )
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      for (const handle of handles) {
        handle(divisor)
      }
      return once(() => {
        const instancedArrays = getInstancedArrays(gl)
        previousDivisors.forEach(([location, previous]) => {
          instancedArrays?.vertexAttribDivisor(location, previous)
        })
      })
    }

    let constant: ReturnType<typeof constantSource> | undefined

    /** One layout, one buffer, but a divisor per draw rather than per schema. */
    function bufferSource(divisor: 0 | 1) {
      const apply = () => applyToVertexArray(divisor)
      return {
        applyToVertexArray: apply,
        bind() {
          const restoreVertexArray = bindDefaultVertexArray(gl)
          const restore = apply()
          return once(() => {
            restore()
            restoreVertexArray()
          })
        },
      }
    }

    return {
      buffer: Object.assign(bufferSource(0), {
        /** The same buffer, stepped once per instance instead of once per vertex. */
        perInstance: bufferSource(1),
        set(value: Float32Array, usage: GLUsage = 'STATIC_DRAW') {
          // Uploading is storage, not binding: ARRAY_BUFFER is not vertex-array
          // state, so this touches no array, whichever one is bound.
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
          gl.bufferData(gl.ARRAY_BUFFER, value, gl[usage])
        },
      }),
      // Lazy: a layout key can be perfectly good in a buffer and impossible as
      // a constant, and finding that out should wait until someone asks for one.
      get constant() {
        return (constant ??= constantSource(gl, layout, locations))
      },
      dispose() {
        gl.deleteBuffer(buffer)
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

    function applyToVertexArray() {
      // Snapshot before the change, restore in the disposer. Restoring the
      // previous buffer rather than null matters for ELEMENT_ARRAY_BUFFER,
      // whose binding is recorded in the bound vertex array: clearing it
      // would strip the index buffer from an array the caller may not own.
      const previousBuffer = gl.getParameter(gl[`${target}_BINDING`]) as WebGLBuffer | null
      gl.bindBuffer(gl[target], buffer)
      return once(() => {
        gl.bindBuffer(gl[target], previousBuffer)
      })
    }

    return {
      applyToVertexArray,
      bind() {
        // ELEMENT_ARRAY_BUFFER's binding belongs to the bound vertex array, so
        // like the attributes this has to say which array it means. ARRAY_BUFFER
        // is context state and unaffected either way.
        const restoreVertexArray = bindDefaultVertexArray(gl)
        const restore = applyToVertexArray()
        return once(() => {
          restore()
          restoreVertexArray()
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
