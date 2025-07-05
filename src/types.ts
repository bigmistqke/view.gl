export type RemoveSuffix<T, S extends string> = {
  [K in keyof T as K extends `${infer Prefix}${S}` ? Prefix : K]: T[K]
}

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

export type UniformKind =
  | '1f'
  | '2f'
  | '3f'
  | '4f'
  | '1i'
  | '2i'
  | '3i'
  | '4i'
  | '1ui'
  | '2ui'
  | '3ui'
  | '4ui'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'mat2x3'
  | 'mat2x4'
  | 'mat3x2'
  | 'mat3x4'
  | 'mat4x2'
  | 'mat4x3'
  | 'sampler2D'
  | 'samplerCube'
  | 'sampler2DArray'
  | 'isampler2D'
  | 'isamplerCube'
  | 'isampler2DArray'
  | 'usampler2D'
  | 'usamplerCube'
  | 'usampler2DArray'

// prettier-ignore
interface UniformKindMap {
  '1f': [number]
  '2f': [number, number]
  '3f': [number, number, number]
  '4f': [number, number, number, number]

  '1i': [number]
  '2i': [number, number]
  '3i': [number, number, number]
  '4i': [number, number, number, number]

  '1ui': [number]
  '2ui': [number, number]
  '3ui': [number, number, number]
  '4ui': [number, number, number, number]

  mat2:
    | [Float32Array]
    | [number, number, number, number]

  mat3:
    | [Float32Array]
    | [number, number, number, number, number, number, number, number, number]

  mat4:
    | [Float32Array]
    | [number, number, number, number,
       number, number, number, number,
       number, number, number, number,
       number, number, number, number]

  mat2x3:
    | [Float32Array]
    | [number, number, number,
       number, number, number]

  mat2x4:
    | [Float32Array]
    | [number, number, number, number,
       number, number, number, number]

  mat3x2:
    | [Float32Array]
    | [number, number,
       number, number,
       number, number]

  mat3x4:
    | [Float32Array]
    | [number, number, number, number,
       number, number, number, number,
       number, number, number, number]

  mat4x2:
    | [Float32Array]
    | [number, number,
       number, number,
       number, number,
       number, number]

  mat4x3:
    | [Float32Array]
    | [number, number, number,
       number, number, number,
       number, number, number,
       number, number, number]

  // texture unit index
  sampler2D: [number]           
  samplerCube: [number]
  sampler2DArray: [number]

  isampler2D: [number]
  isamplerCube: [number]
  isampler2DArray: [number]

  usampler2D: [number]
  usamplerCube: [number]
  usampler2DArray: [number]
}

export type UniformSchema = Record<string, UniformKind>

export interface UniformMethods<TKind extends UniformKind> {
  set(...args: UniformKindMap[TKind]): void
}

export type InferUniforms<T extends UniformSchema> = {
  [K in keyof T]: UniformMethods<T[K]>
}

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

export type InferAttributeView<T extends AttributeSchema> = {
  [K in keyof T]: AttributeMethods
}

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
  set(data: Float32Array, usage?: GLUsage): void
  dispose(): void
}

export type InferInterleavedAttributes<T extends InterleavedAttributeSchema> = {
  [K in keyof T]: InterleavedAttributeMethods
}

/**********************************************************************************/
/*                                                                                */
/*                                     Buffers                                    */
/*                                                                                */
/**********************************************************************************/

export type BufferSchema = Record<string, BufferOptions>

export interface BufferMethods {
  set(data: Float32Array | Uint16Array | Uint32Array): void
  bind(): void
  dispose(): void
}

export type InferBuffers<T extends BufferSchema> = {
  [K in keyof T]: BufferMethods
}

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

export type InferFramebuffers<T extends FramebufferSchema> = {
  [K in keyof T]: FramebufferMethods
}

export interface BufferOptions {
  target?: GLTarget
  usage?: GLUsage
}

export type TextureTarget =
  | 'TEXTURE_2D'
  | 'TEXTURE_CUBE_MAP'
  | 'TEXTURE_3D' // WebGL2 only
  | 'TEXTURE_2D_ARRAY' // WebGL2 only

export type TextureDesc = {
  target?: TextureTarget
}

export type TextureSchema = Record<string, TextureDesc>

export interface TextureMethods {
  dispose(): void
  bind(unit?: number): void
  set(data: ImageBufferSource | null, options?: Partial<TexImage2DOptions>): void
  parameters(params: Record<number, number>): void
}

export type InferTextures<T extends TextureSchema> = {
  [K in keyof T]: TextureMethods
}

export type TextureParameterName =
  | 'TEXTURE_MIN_FILTER'
  | 'TEXTURE_MAG_FILTER'
  | 'TEXTURE_WRAP_S'
  | 'TEXTURE_WRAP_T'
  | 'TEXTURE_WRAP_R' // For WebGL2 (3D textures)

export type TextureParameterValue =
  // Filters
  | 'NEAREST'
  | 'LINEAR'
  | 'NEAREST_MIPMAP_NEAREST'
  | 'LINEAR_MIPMAP_NEAREST'
  | 'NEAREST_MIPMAP_LINEAR'
  | 'LINEAR_MIPMAP_LINEAR'

  // Wrap modes
  | 'CLAMP_TO_EDGE'
  | 'REPEAT'
  | 'MIRRORED_REPEAT'

// The texture parameters record type
export type TextureParameters = Partial<Record<TextureParameterName, TextureParameterValue>>

// Internal formats (commonly used)
export type InternalFormat =
  | 'ALPHA'
  | 'RGB'
  | 'RGBA'
  | 'LUMINANCE'
  | 'LUMINANCE_ALPHA'
  | 'DEPTH_COMPONENT'
  | 'DEPTH_STENCIL'
  // WebGL2 adds many more, e.g.
  | 'R8'
  | 'RG8'
  | 'RGB8'
  | 'RGBA8'
  | 'DEPTH_COMPONENT16'
  | 'DEPTH_COMPONENT24'
  | 'DEPTH24_STENCIL8'

// Formats (same as internalFormat in WebGL1)
export type Format =
  | 'ALPHA'
  | 'RGB'
  | 'RGBA'
  | 'LUMINANCE'
  | 'LUMINANCE_ALPHA'
  | 'DEPTH_COMPONENT'
  | 'DEPTH_STENCIL'

// Data types
export type PixelType =
  | 'UNSIGNED_BYTE'
  | 'UNSIGNED_SHORT_5_6_5'
  | 'UNSIGNED_SHORT_4_4_4_4'
  | 'UNSIGNED_SHORT_5_5_5_1'
  | 'FLOAT' // WebGL extension or WebGL2
  | 'HALF_FLOAT' // WebGL2 or extension
  | 'UNSIGNED_INT_24_8' // WebGL2
  | 'UNSIGNED_INT'
  | 'BYTE'
  | 'SHORT'
  | 'INT'

// Options for the set() method
export type TexImage2DOptions = {
  level: number
  internalFormat: InternalFormat
  width: number
  height: number
  border: number
  format: Format
  type: PixelType
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
  textures?: TextureSchema
}

export type View<T extends ViewSchema = ViewSchema> = {
  attributes: T['attributes'] extends AttributeSchema
    ? InferAttributeView<T['attributes']>
    : undefined
  interleavedAttributes: T['interleavedAttributes'] extends InterleavedAttributeSchema
    ? InferInterleavedAttributes<T['interleavedAttributes']>
    : undefined
  buffers: T['buffers'] extends BufferSchema ? InferBuffers<T['buffers']> : undefined
  framebuffers: T['framebuffers'] extends FramebufferSchema
    ? InferFramebuffers<T['framebuffers']>
    : undefined
  uniforms: T['uniforms'] extends UniformSchema ? InferUniforms<T['uniforms']> : undefined
  textures: T['textures'] extends TextureSchema ? InferTextures<T['textures']> : undefined
}
