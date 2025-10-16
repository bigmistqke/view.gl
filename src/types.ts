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

export type DeepMerge<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? DeepMergeTwo<L, DeepMerge<R>>
  : unknown

type DeepMergeTwo<TBase, TOverride> = {
  [K in keyof TBase | keyof TOverride]: K extends keyof TOverride
    ? K extends keyof TBase
      ? ShallowMerge<[TBase[K], TOverride[K]]>
      : TOverride[K]
    : K extends keyof TBase
      ? TBase[K]
      : never
}

// see https://stackoverflow.com/a/49683575
export type ShallowMerge<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? ShallowMergeTwo<L, ShallowMerge<R>>
  : unknown

type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never
}[keyof T]

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>
}

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type ShallowMergeTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

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

export interface KIND_TO_UNIFORM_FN_NAME_MAP {
  // Floats (WebGL1 + WebGL2)
  float: '1f'
  vec2: '2f'
  vec3: '3f'
  vec4: '4f'

  // Signed Integers (WebGL1 + WebGL2)
  int: '1i'
  ivec2: '2i'
  ivec3: '3i'
  ivec4: '4i'

  // Matrices (WebGL1 + WebGL2)
  mat2: 'Matrix2fv'
  mat3: 'Matrix3fv'
  mat4: 'Matrix4fv'

  // Unsigned Integers (WebGL2 only)
  uint: '1ui'
  uvec2: '2ui'
  uvec3: '3ui'
  uvec4: '4ui'

  // WebGL2 extended matrix types
  mat2x3: 'Matrix2x3fv'
  mat2x4: 'Matrix2x4fv'
  mat3x2: 'Matrix3x2fv'
  mat3x4: 'Matrix3x4fv'
  mat4x2: 'Matrix4x2fv'
  mat4x3: 'Matrix4x3fv'

  // Booleans — GLSL booleans are set with uniform1i
  bool: '1i'
  bvec2: '2i'
  bvec3: '3i'
  bvec4: '4i'

  // Samplers — all use 1i to bind texture unit indices
  sampler2D: '1i'
  samplerCube: '1i'
  sampler2DArray: '1i'
  sampler3D: '1i' // WebGL2
  sampler2DShadow: '1i' // WebGL2
  samplerCubeShadow: '1i' // WebGL2
  sampler2DArrayShadow: '1i' // WebGL2

  // Integer samplers (WebGL2)
  isampler2D: '1i'
  isampler3D: '1i'
  isamplerCube: '1i'
  isampler2DArray: '1i'

  // Unsigned integer samplers (WebGL2)
  usampler2D: '1i'
  usampler3D: '1i'
  usamplerCube: '1i'
  usampler2DArray: '1i'
}

export interface KIND_TO_SIZE_MAP {
  // Floats
  float: 1
  vec2: 2
  vec3: 3
  vec4: 4

  // Signed integers
  int: 1
  ivec2: 2
  ivec3: 3
  ivec4: 4

  // Booleans (set as ints)
  bool: 1
  bvec2: 2
  bvec3: 3
  bvec4: 4

  // Unsigned integers (WebGL2)
  uint: 1
  uvec2: 2
  uvec3: 3
  uvec4: 4

  // Matrices
  mat2: 4
  mat3: 9
  mat4: 16
  mat2x3: 6
  mat2x4: 8
  mat3x2: 6
  mat3x4: 12
  mat4x2: 8
  mat4x3: 12

  // Samplers (texture unit indices)
  sampler2D: 1
  samplerCube: 1
  sampler3D: 1
  sampler2DArray: 1
  sampler2DShadow: 1
  samplerCubeShadow: 1
  sampler2DArrayShadow: 1

  // Integer samplers (WebGL2)
  isampler2D: 1
  isampler3D: 1
  isamplerCube: 1
  isampler2DArray: 1

  // Unsigned integer samplers (WebGL2)
  usampler2D: 1
  usampler3D: 1
  usamplerCube: 1
  usampler2DArray: 1
}

/**********************************************************************************/
/*                                                                                */
/*                                     Uniform                                    */
/*                                                                                */
/**********************************************************************************/

export type UniformFnName =
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

export interface UniformOptions {
  kind: UniformKind
  size?: number
}

export type UniformSchema = Record<string | symbol, UniformOptions>
export type UniformSchemaPartial = Record<string | symbol, Partial<UniformOptions>>

export type UniformMethods<TOptions extends UniformOptions> = TOptions['size'] extends number
  ? {
      set(arg: Float32Array): void
    }
  : {
      set(...args: UniformKindMap[TOptions['kind']]): void
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
  buffer?: WebGLBuffer
}

export type AttributeSchema = Record<string | symbol, AttributeOptions>

export interface AttributeMethods<T = AttributeKind> {
  buffer: WebGLBuffer
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
  key: string | symbol
  kind: AttributeKind
}

export interface InterleavedAttributeOptions {
  layout: InterleavedAttributeLayout[]
  instanced?: boolean
}

export type InterleavedAttributeSchema = Record<string | symbol, InterleavedAttributeOptions>

export interface InterleavedAttributeMethods<
  T extends InterleavedAttributeLayout[] = InterleavedAttributeLayout[],
> {
  bind(): void
  unbind(): void
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

export type BufferSchema = Record<string | symbol, BufferOptions>

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
/*                                    Framebuffer                                 */
/*                                                                                */
/**********************************************************************************/

export interface FramebufferOptions extends Omit<TextureOptions, 'data'> {
  attachment: 'color' | 'depth' | 'stencil' | 'depthStencil'
  texture?: WebGLTexture
}

export interface TextureOptions {
  target?: GLTextureTarget
  width: number
  height: number
  level?: number
  border?: number
  internalFormat?: GLTextureFormat
  format?: GLTextureFormat
  type?: GLTextureType
  minFilter?: GLTextureFilter
  magFilter?: GLTextureFilter
  wrapS?: GLTextureWrap
  wrapT?: GLTextureWrap
  data?: ArrayBufferView | null
}

export interface Framebuffer {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
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

export type TextureSchema = Record<string | symbol, TextureOptions>

export interface TextureMethods {
  texture: WebGLTexture
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

export interface ViewOptions {
  signal?: AbortSignal
}

export interface ViewSchema {
  uniforms?: UniformSchema
  attributes?: AttributeSchema
  interleavedAttributes?: InterleavedAttributeSchema
  buffers?: BufferSchema
}

export interface ViewSchemaPartial {
  uniforms?: Record<string | symbol, Partial<UniformOptions>>
  attributes?: Record<string | symbol, Partial<AttributeOptions>>
  interleavedAttributes?: Record<string | symbol, Partial<InterleavedAttributeOptions>>
  buffers?: Record<string | symbol, Partial<BufferOptions>>
}

export type View<T extends ViewSchema = ViewSchema> = {
  attributes: T['attributes'] extends AttributeSchema ? AttributeView<T['attributes']> : undefined
  interleavedAttributes: T['interleavedAttributes'] extends InterleavedAttributeSchema
    ? InterleavedAttributeView<T['interleavedAttributes']>
    : undefined
  buffers: T['buffers'] extends BufferSchema ? BufferView<T['buffers']> : undefined
  uniforms: T['uniforms'] extends UniformSchema ? UniformView<T['uniforms']> : never
}

/**********************************************************************************/
/*                                                                                */
/*                                       Tags                                     */
/*                                                                                */
/**********************************************************************************/

export interface GLSLResult {
  program: WebGLProgram
  schema: ViewSchema
}

type GLSLSlotItem = GLSLTag | UniformTag | AttributeTag | InterleaveTag | string | number | symbol

export type GLSLSlot = GLSLSlotItem | Array<GLSLSlotItem>

export interface GLSLTag<TSlots extends GLSLSlot[] = GLSLSlot[]> {
  type: 'glsl'
  template: TemplateStringsArray
  slots: TSlots
}

export type UniformTag<
  TKey extends string | symbol = string | symbol,
  TKind extends UniformKind = UniformKind,
  TOptions extends Partial<UniformOptions> = UniformOptions,
> = TOptions extends { size: infer TSize }
  ? {
      type: 'uniform'
      kind: TKind
      key: TKey
      size: TSize
    }
  : {
      type: 'uniform'
      kind: TKind
      key: TKey
    }

export interface UniformTagFn<TKind extends UniformKind> {
  <const TKey extends string | symbol, const TOptions extends Omit<UniformOptions, 'kind'>>(
    key: TKey,
    TOptions: TOptions,
  ): Prettify<UniformTag<TKey, TKind, TOptions>>
  <const TName extends string | symbol>(key: TName): Prettify<UniformTag<TName, TKind>>
}

export interface AttributeTag<
  TKey extends string | symbol = string | symbol,
  TKind extends AttributeKind = AttributeKind,
  TInstanced extends boolean | undefined = boolean | undefined,
> {
  type: 'attribute'
  kind: TKind
  instanced: TInstanced
  key: TKey
}

export interface AttributeTagFn<TKey extends AttributeKind> {
  <TName extends string | symbol, TOptions extends Omit<AttributeOptions, 'kind'>>(
    key: TName,
    options: TOptions,
  ): Prettify<AttributeTag<TName, TKey, TOptions['instanced']>>
  <TName extends string | symbol>(key: TName): Prettify<AttributeTag<TName, TKey, undefined>>
}

export type InterleaveTag<
  TKey extends string | symbol = string | symbol,
  TLayout extends Array<AttributeTag<string | symbol, AttributeKind, undefined>> = Array<
    AttributeTag<string | symbol, AttributeKind, undefined>
  >,
  TOptions extends Omit<AttributeOptions, 'kind'> = Omit<AttributeOptions, 'kind'>,
> = TOptions & {
  key: TKey
  type: 'interleavedAttribute'
  layout: {
    [TKey in keyof TLayout]: Prettify<Pick<TLayout[TKey], 'kind' | 'key'>>
  }
}
