import type {
  AttributeKind,
  FramebufferDefinition,
  GL,
  KIND_TO_SIZE_MAP,
  KIND_TO_UNIFORM_FN_NAME_MAP,
  TextureDefinition,
  UniformKind,
} from '../types'

export * as ObjectUtils from './object'

export function assertedNotNullish<T>(value: T, message?: string): NonNullable<T> {
  if (value === undefined || value === null) throw new Error(message)
  return value
}

function createGLShader(gl: GL, type: number, source: string): WebGLShader {
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

export function createProgram(gl: GL, vertexSource: string, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create WebGL program')

  const vertexShader = createGLShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createGLShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

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
): WebGLTexture {
  const texture = gl.createTexture()

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

  console.log(minFilter)
  // Set texture parameters
  gl.texParameteri(gl[target], gl.TEXTURE_MIN_FILTER, gl[minFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_MAG_FILTER, gl[magFilter])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_S, gl[wrapS])
  gl.texParameteri(gl[target], gl.TEXTURE_WRAP_T, gl[wrapT])

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

export function createFramebuffer(
  gl: GL,
  { attachment, texture, ...options }: FramebufferDefinition,
) {
  // Create texture for the framebuffer
  texture ??= createTexture(gl, options)

  // Create framebuffer
  const framebuffer = assertedNotNullish(
    gl.createFramebuffer(),
    `Failed to create framebuffer: ${name}`,
  )

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

  return {
    texture,
    framebuffer,
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
