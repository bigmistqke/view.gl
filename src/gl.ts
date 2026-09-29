import { RemoveSuffix } from './type-utils'
import type { GL, ViewOptions } from './types'
import { created, ProgramLinkError, ShaderCompileError } from './errors'
import { once } from './utils'

function isWebGL2RenderingContext(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): gl is WebGL2RenderingContext {
  return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
}

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

/**********************************************************************************/
/*                                                                                */
/*                              Get Instanced Arrays                              */
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
export function getInstancedArrays(gl: GL) {
  if (isWebGL2RenderingContext(gl)) return gl

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

/**********************************************************************************/
/*                                                                                */
/*                             Get Vertex Array Object                            */
/*                                                                                */
/**********************************************************************************/

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
export function getVertexArrayObject(gl: GL) {
  if (isWebGL2RenderingContext(gl)) return gl

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
