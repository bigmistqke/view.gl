export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] | B[K]
      : A[K]
    : K extends keyof B
    ? B[K]
    : never
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

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

export type UniformShorthand =
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

export type UniformKind =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'int'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'bool'
  | 'bvec2'
  | 'bvec3'
  | 'bvec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'sampler2D'
  | 'samplerCube'
  // webgl2
  | 'uint'
  | 'uvec2'
  | 'uvec3'
  | 'uvec4'
  | 'mat2x3'
  | 'mat2x4'
  | 'mat3x2'
  | 'mat3x4'
  | 'mat4x2'
  | 'mat4x3'
  | 'sampler3D'
  | 'sampler2DArray'
  | 'sampler2DShadow'
  | 'samplerCubeShadow'
  | 'sampler2DArrayShadow'
  | 'isampler2D'
  | 'isampler3D'
  | 'isamplerCube'
  | 'isampler2DArray'
  | 'usampler2D'
  | 'usampler3D'
  | 'usamplerCube'
  | 'usampler2DArray'

// prettier-ignore
interface UniformKindMap {
  // Float scalars and vectors
  float: [number];
  vec2: [number, number];
  vec3: [number, number, number];
  vec4: [number, number, number, number];

  // Signed integer scalars and vectors
  int: [number];
  ivec2: [number, number];
  ivec3: [number, number, number];
  ivec4: [number, number, number, number];

  // Booleans (set with uniform1i)
  bool: [number];
  bvec2: [number, number];
  bvec3: [number, number, number];
  bvec4: [number, number, number, number];

  // Unsigned integer scalars and vectors (WebGL2)
  uint: [number];
  uvec2: [number, number];
  uvec3: [number, number, number];
  uvec4: [number, number, number, number];

  // Matrices (float arrays or explicit numbers)
  mat2:
    | [Float32Array]
    | [
        number, number,
        number, number
      ];

  mat3:
    | [Float32Array]
    | [
        number, number, number,
        number, number, number,
        number, number, number
      ];

  mat4:
    | [Float32Array]
    | [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
      ];

  // WebGL2 extended matrix types
  mat2x3:
    | [Float32Array]
    | [
        number, number, number,
        number, number, number
      ];

  mat2x4:
    | [Float32Array]
    | [
        number, number, number, number,
        number, number, number, number
      ];

  mat3x2:
    | [Float32Array]
    | [
        number, number,
        number, number,
        number, number
      ];

  mat3x4:
    | [Float32Array]
    | [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
      ];

  mat4x2:
    | [Float32Array]
    | [
        number, number,
        number, number,
        number, number,
        number, number
      ];

  mat4x3:
    | [Float32Array]
    | [
        number, number, number,
        number, number, number,
        number, number, number,
        number, number, number
      ];

  // Samplers — always a single number (texture unit)
  sampler2D: [number];
  samplerCube: [number];
  sampler3D: [number];             // WebGL2
  sampler2DArray: [number];        // WebGL2
  sampler2DShadow: [number];       // WebGL2
  samplerCubeShadow: [number];     // WebGL2
  sampler2DArrayShadow: [number];  // WebGL2

  // Integer samplers (WebGL2)
  isampler2D: [number];
  isampler3D: [number];
  isamplerCube: [number];
  isampler2DArray: [number];

  // Unsigned integer samplers (WebGL2)
  usampler2D: [number];
  usampler3D: [number];
  usamplerCube: [number];
  usampler2DArray: [number];
}

export type UniformSchema = Record<string, UniformKind>

export interface UniformMethods<TKind extends UniformKind> {
  set(...args: UniformKindMap[TKind]): void
}

export type UniformView<T extends UniformSchema> = {
  [K in keyof T]: UniformMethods<T[K]>
}

/**********************************************************************************/
/*                                                                                */
/*                                   Attributes                                   */
/*                                                                                */
/**********************************************************************************/

export type AttributeShortHand =
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

export type AttributeKind =
  // webgl1
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'

  // webgl2
  | 'mat2x3'
  | 'mat2x4'
  | 'mat3x2'
  | 'mat3x4'
  | 'mat4x2'
  | 'mat4x3'

  // (via vertexAttribIPointer)
  | 'int'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'uint'
  | 'uvec2'
  | 'uvec3'
  | 'uvec4'

export interface AttributeOptions {
  kind: AttributeKind
  instanced?: boolean
}

export type AttributeSchema = Record<string, AttributeOptions>

export interface AttributeMethods<T = AttributeKind> {
  bind(): void
  set(data: Float32Array, usage?: GLUsage): { bind(): void }
  dispose(): void
}

export type AttributeView<T extends AttributeSchema> = {
  [K in keyof T]: AttributeMethods<T[K]['kind']>
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

export type InterleavedAttributeSchema = Record<string, InterleavedAttributeOptions>

export interface InterleavedAttributeMethods<
  T extends InterleavedAttributeLayout[] = InterleavedAttributeLayout[],
> {
  bind(): void
  set(data: Float32Array, usage?: GLUsage): void
  dispose(): void
}

export type InterleavedAttributeView<T extends InterleavedAttributeSchema> = {
  [K in keyof T]: InterleavedAttributeMethods<T[K]['layout']>
}

/**********************************************************************************/
/*                                                                                */
/*                                     Buffers                                    */
/*                                                                                */
/**********************************************************************************/

export interface BufferOptions {
  target?: GLTarget
  usage?: GLUsage
}

export type BufferSchema = Record<string, BufferOptions>

export interface BufferMethods {
  set(data: Float32Array | Uint16Array | Uint32Array): void
  bind(): void
  dispose(): void
}

export type BufferView<T extends BufferSchema> = {
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

export type FramebufferView<T extends FramebufferSchema> = {
  [K in keyof T]: FramebufferMethods
}

/**********************************************************************************/
/*                                                                                */
/*                                   Texture View                                 */
/*                                                                                */
/**********************************************************************************/

export type TextureTarget =
  | 'TEXTURE_2D'
  | 'TEXTURE_CUBE_MAP'
  | 'TEXTURE_3D' // WebGL2 only
  | 'TEXTURE_2D_ARRAY' // WebGL2 only

export type TextureSchema = Record<string, TextureOptions>

export interface TextureMethods {
  dispose(): void
  bind(unit?: number): void
  set(data: ImageBufferSource | null, options?: Partial<TexImage2DOptions>): void
  parameters(params: Record<number, number>): void
}

export type TextureView<T extends TextureSchema> = {
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
  attributes: T['attributes'] extends AttributeSchema ? AttributeView<T['attributes']> : undefined
  interleavedAttributes: T['interleavedAttributes'] extends InterleavedAttributeSchema
    ? InterleavedAttributeView<T['interleavedAttributes']>
    : undefined
  buffers: T['buffers'] extends BufferSchema ? BufferView<T['buffers']> : undefined
  framebuffers: T['framebuffers'] extends FramebufferSchema
    ? FramebufferView<T['framebuffers']>
    : undefined
  uniforms: T['uniforms'] extends UniformSchema ? UniformView<T['uniforms']> : never
  textures: T['textures'] extends TextureSchema ? TextureView<T['textures']> : undefined
}
