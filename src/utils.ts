import type { GL, TextureOptions } from './types'

export function mapObject<T extends Record<string, any>, TReturn>(
  value: T,
  callback: (value: T[keyof T], key: Extract<keyof T, string>, index: number) => TReturn,
): { [TKey in keyof T]: TReturn } {
  return Object.fromEntries(
    Object.entries(value).map(([key, value], index) => [key, callback(value, key, index)]),
  )
}

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

export function createGLProgram(
  gl: GL,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
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
