type PickMaybe<
  T extends Record<string, any> | undefined,
  U extends keyof T | (string & {}),
> = T extends Record<string, any> ? T[U] : undefined

export type GL = WebGLRenderingContext | WebGL2RenderingContext

/**********************************************************************************/
/*                                                                                */
/*                                    Constants                                   */
/*                                                                                */
/**********************************************************************************/

type GLTarget = 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER'
type GLUsage = 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW'
type GLTextureTarget = 'TEXTURE_2D' | 'TEXTURE_CUBE_MAP'
type GLTextureFormat = 'RGBA' | 'RGB' | 'RGBA32F' | 'RGB32F' | 'RGBA16F' | 'RGB16F'
type GLTextureType = 'UNSIGNED_BYTE' | 'FLOAT' | 'HALF_FLOAT'
type GLTextureFilter = 'NEAREST' | 'LINEAR'
type GLTextureWrap = 'CLAMP_TO_EDGE' | 'REPEAT' | 'MIRRORED_REPEAT'

/**********************************************************************************/
/*                                                                                */
/*                                     Uniform                                    */
/*                                                                                */
/**********************************************************************************/

export type UniformKind = '1f' | '2f' | '3f' | '4f' | '1i' | '2i' | '3i' | '4i' | 'mat3' | 'mat4'

interface UniformKindMap {
  '1f': [number]
  '2f': [number, number]
  '3f': [number, number, number]
  '4f': [number, number, number, number]
  '1i': [number]
  '2i': [number, number]
  '3i': [number, number, number]
  '4i': [number, number, number, number]
  mat3: [Float32Array] | [number, number, number, number, number, number, number, number, number]
  mat4: [
    | Float32Array
    | [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ],
  ]
}

export type UniformSchema = Record<string, UniformKind>

export interface UniformMethods<TKind extends UniformKind> {
  set(...args: UniformKindMap[TKind]): void
}

export type InferUniforms<T extends UniformSchema | undefined = Record<string, any>> =
  T extends UniformSchema
    ? {
        [K in keyof T]: UniformMethods<T[K]>
      }
    : undefined

/**********************************************************************************/
/*                                                                                */
/*                                   Attributes                                   */
/*                                                                                */
/**********************************************************************************/

export type AttributeKind = '1f' | '2f' | '3f' | '4f'

export interface AttributeOptions {
  kind: AttributeKind
  instanced?: boolean
}

export type AttributeSchema = Record<string, AttributeOptions>

export interface AttributeMethods {
  bind(): void
  set(data: Float32Array, usage?: GLUsage): AttributeMethods
  dispose(): void
}

export type InferAttributeView<T extends AttributeSchema | undefined = Record<string, any>> =
  T extends AttributeSchema
    ? [
        attributes: {
          [K in keyof T]: AttributeMethods
        },
        disposeAttributes: () => void,
      ]
    : []

/**********************************************************************************/
/*                                                                                */
/*                              Interleaved Attributes                           */
/*                                                                                */
/**********************************************************************************/

export interface InterleavedAttributeLayout {
  name: string
  kind: AttributeKind
}

export interface InterleavedAttributeOptions {
  layout: InterleavedAttributeLayout[]
  instanced?: boolean
}

export type InterleavedAttributeSchema = Record<
  string,
  {
    layout: InterleavedAttributeLayout[]
    instanced?: boolean
  }
>

export interface InterleavedAttributeMethods {
  bind(): void
  set(data: Float32Array, usage?: GLUsage): InterleavedAttributeMethods
  dispose(): void
}

export type InferInterleavedAttributes<
  T extends InterleavedAttributeSchema | undefined = Record<string, any>,
> = T extends InterleavedAttributeSchema
  ? [
      interleavedAttributes: {
        [K in keyof T]: InterleavedAttributeMethods
      },
      dispose: () => void,
    ]
  : []

/**********************************************************************************/
/*                                                                                */
/*                                     Buffers                                    */
/*                                                                                */
/**********************************************************************************/

export type BufferSchema = Record<string, BufferOptions>

export interface BufferMethods {
  set(data: Float32Array | Uint16Array | Uint32Array): BufferMethods
  bind(): void
  dispose(): void
}

export type InferBuffers<T extends BufferSchema | undefined = Record<string, any>> =
  T extends BufferSchema
    ? [
        buffers: {
          [K in keyof T]: BufferMethods
        },
        disposeBuffers: () => void,
      ]
    : []

/**********************************************************************************/
/*                                                                                */
/*                                   Framebuffers                                 */
/*                                                                                */
/**********************************************************************************/

export type FramebufferSchema = Record<string, FramebufferOptions>

export interface FramebufferOptions extends Omit<TextureOptions, 'data'> {
  attachment: 'color' | 'depth' | 'stencil' | 'depthStencil'
}

export interface TextureOptions {
  target?: GLTextureTarget
  width: number
  height: number
  internalFormat?: GLTextureFormat
  format?: GLTextureFormat
  type?: GLTextureType
  minFilter?: GLTextureFilter
  magFilter?: GLTextureFilter
  wrapS?: GLTextureWrap
  wrapT?: GLTextureWrap
  data?: ArrayBufferView | null
}

export interface FramebufferMethods {
  bind(): void
  dispose(): void
}

export type InferFramebuffers<T extends FramebufferSchema | undefined = Record<string, any>> =
  T extends FramebufferSchema
    ? [
        framebuffers: {
          [K in keyof T]: FramebufferMethods
        },
        dispose: () => void,
      ]
    : []

export interface BufferOptions {
  target?: GLTarget
  usage?: GLUsage
}

/**********************************************************************************/
/*                                                                                */
/*                                      Config                                    */
/*                                                                                */
/**********************************************************************************/

export interface ShaderConfig {
  gl: GL
  vertex: string
  fragment: string
}

/**********************************************************************************/
/*                                                                                */
/*                                     View State                                 */
/*                                                                                */
/**********************************************************************************/

export type ViewState =
  | {
      gl: WebGLRenderingContext
      isWebGL2: false
      program: WebGLProgram
      instancedArraysExt: ANGLE_instanced_arrays | null
    }
  | {
      gl: WebGL2RenderingContext
      isWebGL2: true
      program: WebGLProgram
      instancedArraysExt?: never
    }

/**********************************************************************************/
/*                                                                                */
/*                                       View                                     */
/*                                                                                */
/**********************************************************************************/

export interface ViewSchema {
  uniforms?: UniformSchema
  attributes?: AttributeSchema
  interleavedAttributes?: InterleavedAttributeSchema
  buffers?: BufferSchema
  framebuffers?: FramebufferSchema
}

export type View<T extends ViewSchema = ViewSchema> = [
  resources: {
    attributes: PickMaybe<InferAttributeView<T['attributes']>, 'methods'>
    interleavedAttributes: PickMaybe<
      InferInterleavedAttributes<T['interleavedAttributes']>,
      'methods'
    >
    buffers: PickMaybe<InferBuffers<T['buffers']>, 'methods'>
    framebuffers: PickMaybe<InferFramebuffers<T['framebuffers']>, 'methods'>
    uniforms: InferUniforms<T['uniforms']>
  },
  dispose: () => void,
]
