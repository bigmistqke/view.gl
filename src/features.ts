import type { GL, RemoveSuffix } from './types'

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
export function getVertexArrayObject(gl: GL) {
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
