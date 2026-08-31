import type {
  AttributeKind,
  FramebufferDefinition,
  GL,
  KIND_TO_SIZE_MAP,
  KIND_TO_UNIFORM_FN_NAME_MAP,
  TextureDefinition,
  UniformKind,
  ViewOptions,
} from './types'

export function assertedNotNullish<T>(value: T, message?: string): NonNullable<T> {
  if (value === undefined || value === null) throw new Error(message)
  return value
}

/**
 * Wraps a teardown so it runs once.
 *
 * Two reasons, and both bite. A disposer is per `bind()`, and undoing twice
 * would put back state a later `bind()` is relying on. And a `dispose()` that
 * deletes twice invalidates a handle someone else may still be holding — the
 * object survives while it is bound, so the fault surfaces later, somewhere
 * else. Idempotent is the only safe shape for either.
 */
export function once(teardown: () => void): () => void {
  let done = false
  return () => {
    if (done) return
    done = true
    teardown()
  }
}

/**********************************************************************************/
/*                                                                                */
/*                              Kind To Uniform Name                              */
/*                                                                                */
/**********************************************************************************/

export const kindToUniformFnName = <T extends UniformKind>(
  kind: T,
): KIND_TO_UNIFORM_FN_NAME_MAP[T] => {
  switch (kind[0]) {
    // mat
    case 'm':
      return ('Matrix' + kind.slice(3) + 'fv') as KIND_TO_UNIFORM_FN_NAME_MAP[T]
    // sampler/booleans/integer
    case 's':
    case 'b':
    case 'i':
      return ((kind.match(/\d/)?.[0] ?? '1') + 'i') as KIND_TO_UNIFORM_FN_NAME_MAP[T]
    // unsigned integers
    case 'u':
      return ((kind[4] || '1') + 'ui') as KIND_TO_UNIFORM_FN_NAME_MAP[T]
    // vec
    case 'v':
      return (kind[3] + 'f') as KIND_TO_UNIFORM_FN_NAME_MAP[T]
    default:
      switch (kind) {
        case 'float':
          return '1f' as KIND_TO_UNIFORM_FN_NAME_MAP[T]
        case 'uint':
          return '1ui' as KIND_TO_UNIFORM_FN_NAME_MAP[T]
        default:
          return '1i' as KIND_TO_UNIFORM_FN_NAME_MAP[T]
      }
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                   Kind To Size                                 */
/*                                                                                */
/**********************************************************************************/

export const kindToSize = <T extends UniformKind>(kind: T): KIND_TO_SIZE_MAP[T] => {
  switch (kind[0]) {
    case 'm':
      const [a, b] = kind.match(/\d+/g)!.map(Number) as [number, number?]
      return (a * (b ?? a)) as KIND_TO_SIZE_MAP[T]
    case 'v':
    case 'i':
    case 'b':
    case 'u':
      const match = kind.match(/\d/) as [string] | undefined
      return (match ? +match[0] : 1) as KIND_TO_SIZE_MAP[T]
    default:
      return 1 as KIND_TO_SIZE_MAP[T]
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                      Guards                                    */
/*                                                                                */
/**********************************************************************************/

export const isMatKind = <
  T extends UniformKind | AttributeKind,
  TPrefix extends string,
  TPostfix extends string,
>(
  kind: T,
): kind is T & `${TPrefix}mat${TPostfix}` => kind.includes('mat')

export const isSamplerKind = <TPrefix extends string, TPostfix extends string>(
  kind: UniformKind,
): kind is UniformKind & `${TPrefix}sampler${TPostfix}` => kind.includes('sampler')

export const isVecKind = <TPrefix extends string, TPostfix extends string>(
  kind: UniformKind,
): kind is UniformKind & `${TPrefix}vec${TPostfix}` => kind.includes('vec')

/**********************************************************************************/
/*                                                                                */
/*                                  Create Texture                                */
/*                                                                                */
/**********************************************************************************/

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
  }: TextureDefinition,
  data?: ArrayBufferView | null,
  { signal }: ViewOptions = {},
): WebGLTexture {
  const texture = assertedNotNullish(gl.createTexture(), 'Failed to create texture')

  function getTextureConstant(name: string) {
    if (!(name in gl)) {
      throw new Error(`Attempted to create webgl2-only texture (${name}) in webgl1`)
    }
    return gl[name as keyof typeof gl] as any
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
    data ?? null,
  )

  // Set texture parameters
  gl.texParameteri(gl[target], gl.TEXTURE_MIN_FILTER, gl[minFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_MAG_FILTER, gl[magFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_S, gl[wrapS])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_T, gl[wrapT])

  signal?.addEventListener(
    'abort',
    once(() => gl.deleteTexture(texture)),
  )

  return texture
}

/**********************************************************************************/
/*                                                                                */
/*                               Create Framebuffer                               */
/*                                                                                */
/**********************************************************************************/

const FRAMEBUFFER_ATTACHMENT_MAP = {
  color: 'COLOR_ATTACHMENT0',
  depth: 'DEPTH_ATTACHMENT',
  stencil: 'STENCIL_ATTACHMENT',
  depthStencil: 'DEPTH_STENCIL_ATTACHMENT',
} as const

class FramebufferError extends Error {
  constructor(gl: GL, status: number) {
    let errorMessage = 'Framebuffer not complete. Status: '
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

export function createFramebuffer(
  gl: GL,
  { attachment, texture: providedTexture, ...definition }: FramebufferDefinition,
  { signal }: ViewOptions = {},
) {
  // Create texture for the framebuffer, unless one was handed in. Which one it
  // is decides who deletes it below — the same rule the attribute buffers follow.
  const texture = providedTexture ?? createTexture(gl, definition)

  // Create framebuffer
  const framebuffer = assertedNotNullish(gl.createFramebuffer(), 'Failed to create framebuffer')

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

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
    throw new FramebufferError(gl, status)
  }

  const dispose = once(() => {
    gl.deleteFramebuffer(framebuffer)
    // A texture handed in belongs to whoever made it — it commonly outlives the
    // framebuffer, ping-ponged between two of them.
    if (!providedTexture) {
      gl.deleteTexture(texture)
    }
  })

  signal?.addEventListener('abort', dispose)

  return {
    texture,
    framebuffer,
    dispose,
  }
}

/**********************************************************************************/
/*                                                                                */
/*                                  Create Upsert                                 */
/*                                                                                */
/**********************************************************************************/

type UpsertMapKind<T, U> = Map<T, U> | (T extends WeakKey ? WeakMap<T, U> : never)

export function createUpsertMap<T extends UpsertMapKind<any, any> = Map<any, any>>(
  constructor?: new () => T,
) {
  const map = new (constructor ?? Map)() as T
  return Object.assign(map, {
    getOrInsert(
      key: T extends UpsertMapKind<infer U, any> ? U : never,
      value: T extends UpsertMapKind<any, infer U> ? () => U : never,
    ) {
      let result = map.get(key)
      if (result) {
        return result
      }
      result = value()
      map.set(key, result)
      return result
    },
  })
}

export function forEachObject<T extends Record<string, any>>(
  value: T,
  callback: (value: T[keyof T], key: keyof T, index: number) => void,
) {
  let index = 0
  for (const key in value) {
    callback(value[key], key, index)
    index++
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    callback(value[key as keyof T], key as keyof T, index)
    index++
  }
}

export function mapObject<T extends Record<string, any>, TReturn>(
  value: T,
  callback: (value: T[keyof T], key: keyof T, index: number) => TReturn,
): { [TKey in keyof T]: TReturn } {
  const result = {} as { [TKey in keyof T]: TReturn }

  forEachObject(value, (value, key, index) => {
    result[key] = callback(value, key, index)
  })

  return result
}
