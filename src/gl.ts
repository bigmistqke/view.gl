import type { GL, ViewOptions } from './types'
import { created, ProgramLinkError, ShaderCompileError } from './errors'
import { once } from './utils'

/**********************************************************************************/
/*                                                                                */
/*                                 Create Shader                                  */
/*                                                                                */
/**********************************************************************************/

export function createShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = created(gl.createShader(type), 'shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = new ShaderCompileError(
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
      gl.getShaderInfoLog(shader),
      gl.getError(),
    )
    gl.deleteShader(shader)
    throw error
  }

  return shader
}

/**********************************************************************************/
/*                                                                                */
/*                                Create Program                                  */
/*                                                                                */
/**********************************************************************************/

export function createProgram(
  gl: GL,
  vertexSource: string,
  fragmentSource: string,
  { signal }: ViewOptions = {},
): WebGLProgram {
  const program = created(gl.createProgram(), 'program')

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = new ProgramLinkError(gl.getProgramInfoLog(program), gl.getError())
    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw error
  }

  // Clean up shaders after linking
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  signal?.addEventListener(
    'abort',
    once(() => gl.deleteProgram(program)),
  )

  return program
}
