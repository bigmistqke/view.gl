import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProgram, createShader } from '../src/gl'
import {
  AttributeNotFoundError,
  GLCreateError,
  ProgramLinkError,
  ShaderCompileError,
  attributeView,
  bufferView,
  createFramebuffer,
  createTexture,
  interleavedAttributeView,
  vaoView,
} from '../src/index'
import type { AttributeSchema } from '../src/types'
import { createMockCanvas } from './mocks/webgl'

let gl: WebGL2RenderingContext
let program: WebGLProgram

beforeEach(() => {
  gl = createMockCanvas().gl
  program = gl.createProgram()!
})

describe('ShaderCompileError', () => {
  it('carries the stage, the info log as given and the GL error', () => {
    gl.getShaderParameter = vi.fn(() => false)
    gl.getShaderInfoLog = vi.fn(() => "ERROR: 0:1: 'x' : undeclared identifier")
    gl.getError = vi.fn(() => 0x0502)

    const error = catchError(() => createShader(gl, gl.FRAGMENT_SHADER, 'void main() {}'))

    expect(error).toBeInstanceOf(ShaderCompileError)
    expect(error).toMatchObject({
      name: 'ShaderCompileError',
      stage: 'fragment',
      infoLog: "ERROR: 0:1: 'x' : undeclared identifier",
      glError: 0x0502,
      message: "Failed to compile fragment shader: ERROR: 0:1: 'x' : undeclared identifier",
    })
  })

  it.each([
    ['null', null],
    ['empty', ''],
  ])('keeps a %s info log as it came', (_, infoLog) => {
    gl.getShaderParameter = vi.fn(() => false)
    gl.getShaderInfoLog = vi.fn(() => infoLog)

    const error = catchError(() => createShader(gl, gl.VERTEX_SHADER, ''))

    expect(error).toMatchObject({ stage: 'vertex', infoLog })
  })

  it('is thrown from createProgram for either stage', () => {
    gl.getShaderParameter = vi.fn(() => false)

    expect(() => createProgram(gl, '', '')).toThrow(ShaderCompileError)
  })
})

describe('ProgramLinkError', () => {
  it('carries the info log as given and the GL error', () => {
    gl.getProgramParameter = vi.fn(() => false)
    gl.getProgramInfoLog = vi.fn(() => null)
    gl.getError = vi.fn(() => 0)

    const error = catchError(() => createProgram(gl, '', ''))

    expect(error).toBeInstanceOf(ProgramLinkError)
    expect(error).toMatchObject({
      name: 'ProgramLinkError',
      infoLog: null,
      glError: 0,
      message: 'Failed to link program: null',
    })
  })
})

describe('GLCreateError', () => {
  it.each([
    [
      'shader',
      () => ((gl.createShader = vi.fn(() => null)), createShader(gl, gl.VERTEX_SHADER, '')),
    ],
    ['program', () => ((gl.createProgram = vi.fn(() => null)), createProgram(gl, '', ''))],
    [
      'buffer',
      () => (
        (gl.createBuffer = vi.fn(() => null)),
        bufferView(gl, { b_index: { target: 'ELEMENT_ARRAY_BUFFER' } })
      ),
    ],
    [
      'buffer',
      () => (
        (gl.createBuffer = vi.fn(() => null)),
        attributeView(gl, program, { a_corner: { kind: 'vec2' } } satisfies AttributeSchema)
      ),
    ],
    [
      'buffer',
      () => (
        (gl.createBuffer = vi.fn(() => null)),
        interleavedAttributeView(gl, program, {
          a_instance: { layout: [{ key: 'a_position', kind: 'vec2' }] },
        })
      ),
    ],
    ['vertexArray', () => ((gl.createVertexArray = vi.fn(() => null)), vaoView(gl, []))],
    [
      'texture',
      () => ((gl.createTexture = vi.fn(() => null)), createTexture(gl, { width: 1, height: 1 })),
    ],
    [
      'framebuffer',
      () => (
        (gl.createFramebuffer = vi.fn(() => null)),
        createFramebuffer(gl, { width: 1, height: 1, attachment: 'color' })
      ),
    ],
  ])('names the %s whose create answered null', (resource, build) => {
    const error = catchError(build)

    expect(error).toBeInstanceOf(GLCreateError)
    expect(error).toMatchObject({
      name: 'GLCreateError',
      resource,
      message: `Failed to create ${resource}`,
    })
  })
})

describe('AttributeNotFoundError', () => {
  it.each([
    [
      'attributeView',
      () => attributeView(gl, program, { a_missing: { kind: 'vec2' } } satisfies AttributeSchema),
    ],
    [
      'interleavedAttributeView',
      () =>
        interleavedAttributeView(gl, program, {
          a_instance: { layout: [{ key: 'a_missing', kind: 'vec2' }] },
        }),
    ],
  ])('names the attribute %s could not find', (_, build) => {
    gl.getAttribLocation = vi.fn(() => -1)

    const error = catchError(build)

    expect(error).toBeInstanceOf(AttributeNotFoundError)
    expect(error).toMatchObject({
      name: 'AttributeNotFoundError',
      attribute: 'a_missing',
      message: "Attribute 'a_missing' not found",
    })
  })
})

function catchError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected a throw')
}
