import { DeepMerge, Prettify, ShallowMerge } from './type-utils'

/**********************************************************************************/
/*                                                                                */
/*                                 WebGL Constants                                */
/*                                                                                */
/**********************************************************************************/

export type GL = WebGLRenderingContext | WebGL2RenderingContext

export type GLTarget = 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER'
export type GLUsage = 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW'
export type GLTextureTarget = 'TEXTURE_2D' | 'TEXTURE_CUBE_MAP'
export type GLTextureFormat = 'RGBA' | 'RGB' | 'RGBA32F' | 'RGB32F' | 'RGBA16F' | 'RGB16F'
export type GLTextureType = 'UNSIGNED_BYTE' | 'FLOAT' | 'HALF_FLOAT'
export type GLTextureFilter = 'NEAREST' | 'LINEAR'
export type GLTextureWrap = 'CLAMP_TO_EDGE' | 'REPEAT' | 'MIRRORED_REPEAT'

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

export type UniformFnName = KIND_TO_UNIFORM_FN_NAME_MAP[keyof KIND_TO_UNIFORM_FN_NAME_MAP]

export type UniformKind = keyof KIND_TO_UNIFORM_FN_NAME_MAP

type MatrixArray<Size extends number> = [Float32Array] | number[]

export interface UniformKindMap {
  // Float scalars and vectors
  float: [number]
  vec2: [number, number]
  vec3: [number, number, number]
  vec4: [number, number, number, number]

  // Signed integer scalars and vectors
  int: [number]
  ivec2: [number, number]
  ivec3: [number, number, number]
  ivec4: [number, number, number, number]

  // Booleans (set with uniform1i)
  bool: [number]
  bvec2: [number, number]
  bvec3: [number, number, number]
  bvec4: [number, number, number, number]

  // Unsigned integer scalars and vectors (WebGL2)
  uint: [number]
  uvec2: [number, number]
  uvec3: [number, number, number]
  uvec4: [number, number, number, number]

  // Matrices
  mat2: MatrixArray<4>
  mat3: MatrixArray<9>
  mat4: MatrixArray<16>

  // WebGL2 extended matrix types
  mat2x3: MatrixArray<6>
  mat2x4: MatrixArray<8>
  mat3x2: MatrixArray<6>
  mat3x4: MatrixArray<12>
  mat4x2: MatrixArray<8>
  mat4x3: MatrixArray<12>

  // Samplers — always a single number (texture unit)
  sampler2D: [number]
  samplerCube: [number]
  sampler3D: [number] // WebGL2
  sampler2DArray: [number] // WebGL2
  sampler2DShadow: [number] // WebGL2
  samplerCubeShadow: [number] // WebGL2
  sampler2DArrayShadow: [number] // WebGL2

  // Integer samplers (WebGL2)
  isampler2D: [number]
  isampler3D: [number]
  isamplerCube: [number]
  isampler2DArray: [number]

  // Unsigned integer samplers (WebGL2)
  usampler2D: [number]
  usampler3D: [number]
  usamplerCube: [number]
  usampler2DArray: [number]
}

export interface UniformDefinition {
  kind: UniformKind
  size?: number
}

export type UniformSchema = Record<string | symbol, UniformDefinition>

/** Methods for a single uniform element */
export type UniformElementMethods<TKind extends UniformKind> = {
  set(...args: UniformKindMap[TKind]): void
}

/** Methods for array uniforms - supports both bulk set and indexed access */
export type UniformArrayMethods<TKind extends UniformKind, TSize extends number> = Array<
  UniformElementMethods<TKind>
> & {
  /** Bulk set all elements at once */
  set(arg: Float32Array): void
}

export type UniformMethods<TDefinition extends UniformDefinition> =
  TDefinition['size'] extends number
    ? UniformArrayMethods<TDefinition['kind'], TDefinition['size']>
    : UniformElementMethods<TDefinition['kind']>

export type UniformView<T extends UniformSchema> = {
  [K in keyof T]: UniformMethods<T[K]>
}

export type UniformValue = UniformKindMap[UniformKind]

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

export interface AttributeDefinition {
  kind: AttributeKind
  instanced?: boolean
  buffer?: WebGLBuffer
}

export type AttributeSchema = Record<string | symbol, AttributeDefinition>

export interface AttributeMethods<T = AttributeKind> {
  buffer: WebGLBuffer
  bind(): void
  set(data: Float32Array, usage?: GLUsage): { bind(): void }
  dispose(): void
}

export type AttributeView<T extends AttributeSchema> = {
  [K in keyof T]: Prettify<AttributeMethods<T[K]['kind']>>
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

export interface InterleavedAttributeDefinition {
  layout: InterleavedAttributeLayout[]
  instanced?: boolean
}

export type InterleavedAttributeSchema = Record<string | symbol, InterleavedAttributeDefinition>

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

export interface BufferDefinition {
  target?: GLTarget
  usage?: GLUsage
}

export type BufferSchema = Record<string | symbol, BufferDefinition>

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

export interface FramebufferDefinition extends Omit<TextureDefinition, 'data'> {
  attachment: 'color' | 'depth' | 'stencil' | 'depthStencil'
  texture?: WebGLTexture
}

export interface TextureDefinition {
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
/*                                     Textures                                   */
/*                                                                                */
/**********************************************************************************/

export type TextureTarget =
  | 'TEXTURE_2D'
  | 'TEXTURE_CUBE_MAP'
  | 'TEXTURE_3D' // WebGL2 only
  | 'TEXTURE_2D_ARRAY' // WebGL2 only

export type TextureSchema = Record<string | symbol, TextureDefinition>

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

type PartialSchema<T> =
  T extends Record<string | symbol, infer V> ? Record<string | symbol, Partial<V>> : never

export interface ViewSchemaPartial {
  uniforms?: PartialSchema<UniformSchema>
  attributes?: PartialSchema<AttributeSchema>
  interleavedAttributes?: PartialSchema<InterleavedAttributeSchema>
  buffers?: PartialSchema<BufferSchema>
}

export type View<T extends ViewSchema = ViewSchema> = {
  attributes: T['attributes'] extends AttributeSchema
    ? Prettify<AttributeView<T['attributes']>>
    : {}
  interleavedAttributes: T['interleavedAttributes'] extends InterleavedAttributeSchema
    ? Prettify<InterleavedAttributeView<T['interleavedAttributes']>>
    : {}
  buffers: T['buffers'] extends BufferSchema ? Prettify<BufferView<T['buffers']>> : {}
  uniforms: T['uniforms'] extends UniformSchema ? Prettify<UniformView<T['uniforms']>> : {}
}

/**********************************************************************************/
/*                                                                                */
/*                                  GLSL System                                   */
/*                                                                                */
/**********************************************************************************/

export interface GLSLResult {
  program: WebGLProgram
  schema: ViewSchema
}

/**********************************************************************************/
/*                                                                                */
/*                                   GLSL Tokens                                  */
/*                                                                                */
/**********************************************************************************/

type GLSLSlotItem =
  | GLSL
  | UniformToken
  | AttributeToken
  | InterleaveToken
  | string
  | number
  | symbol

export type GLSLSlot = GLSLSlotItem | Array<GLSLSlotItem>

export interface GLSL<TSlots extends GLSLSlot[] = GLSLSlot[]> {
  type: 'glsl'
  template: TemplateStringsArray
  slots: TSlots
}

export type UniformToken<
  TKey extends string | symbol = string | symbol,
  TKind extends UniformKind = UniformKind,
  TDefinition extends Partial<UniformDefinition> = UniformDefinition,
> = TDefinition extends { size: infer TSize }
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

export interface UniformTokenFn<TKind extends UniformKind> {
  <const TKey extends string | symbol, const TDefinition extends Omit<UniformDefinition, 'kind'>>(
    key: TKey,
    TDefinition: TDefinition,
  ): Prettify<UniformToken<TKey, TKind, TDefinition>>
  <const TName extends string | symbol>(key: TName): Prettify<UniformToken<TName, TKind>>
}

export interface AttributeToken<
  TKey extends string | symbol = string | symbol,
  TKind extends AttributeKind = AttributeKind,
  TInstanced extends boolean | undefined = boolean | undefined,
> {
  type: 'attribute'
  kind: TKind
  instanced: TInstanced extends boolean ? boolean : false
  key: TKey
}

export interface AttributeTokenFn<TKey extends AttributeKind> {
  <TName extends string | symbol, TDefinition extends Omit<AttributeDefinition, 'kind'>>(
    key: TName,
    options: TDefinition,
  ): Prettify<AttributeToken<TName, TKey, TDefinition['instanced']>>
  <TName extends string | symbol>(key: TName): Prettify<AttributeToken<TName, TKey, undefined>>
}

export type InterleaveToken<
  TKey extends string | symbol = string | symbol,
  TLayout extends Array<AttributeToken<string | symbol, AttributeKind, undefined>> = Array<
    AttributeToken<string | symbol, AttributeKind, undefined>
  >,
  TDefinition extends Omit<AttributeDefinition, 'kind'> = Omit<AttributeDefinition, 'kind'>,
> = TDefinition & {
  key: TKey
  type: 'interleavedAttribute'
  layout: {
    [TKey in keyof TLayout]: Prettify<Pick<TLayout[TKey], 'kind' | 'key'>>
  }
}

export type GLSLToSchema<T extends GLSL> =
  T extends GLSL<infer TSlots>
    ? FlattenSlots<TSlots> extends infer TFlatSlots extends Array<GLSLSlot>
      ? GLSLSlotsToSchema<TFlatSlots>
      : never
    : never

export type GLSLToView<T extends GLSL> = View<GLSLToSchema<T>>

type ExtractTokens<TSlots extends Array<GLSLSlot>, TTokenType> = TSlots[number] extends infer U
  ? U extends TTokenType
    ? U
    : never
  : never

export type GLSLSlotsToSchema<TSlots extends Array<GLSLSlot>> = {
  uniforms: {
    [K in ExtractTokens<TSlots, UniformToken> as K['key']]: Omit<K, 'type'>
  }
  attributes: {
    [K in ExtractTokens<TSlots, AttributeToken> as K['key']]: Omit<K, 'type'>
  }
  interleavedAttributes: {
    [K in ExtractTokens<TSlots, InterleaveToken> as K['key']]: Omit<K, 'type'>
  }
}

export type FlattenSlots<T, MaxDepth extends Depth = 10> =
  T extends Array<GLSLSlot>
    ? _FlattenSlots<T, [], MaxDepth>
    : T extends GLSL<infer TSlots>
      ? _FlattenSlots<TSlots, [], MaxDepth>
      : never

type _FlattenSlots<
  T extends Array<GLSLSlot>,
  Acc extends Array<any> = [],
  CurrentDepth extends Depth = 10,
> = CurrentDepth extends 0
  ? [...Acc, ...T]
  : T extends [infer First, ...infer Rest extends Array<GLSLSlot>]
    ? First extends GLSL<infer TSlots>
      ? _FlattenSlots<
          Rest,
          [...Acc, ..._FlattenSlots<TSlots, [], Dec<CurrentDepth>>],
          Dec<CurrentDepth>
        >
      : First extends GLSLSlot[]
        ? _FlattenSlots<
            Rest,
            [...Acc, ..._FlattenSlots<First, [], Dec<CurrentDepth>>],
            Dec<CurrentDepth>
          >
        : _FlattenSlots<Rest, [...Acc, First], Dec<CurrentDepth>>
    : [...Acc, ...T]

/**********************************************************************************/
/*                                                                                */
/*                                Type Utilities                                  */
/*                                                                                */
/**********************************************************************************/

type Depth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
type Dec<T extends number> = T extends 10
  ? 9
  : T extends 9
    ? 8
    : T extends 8
      ? 7
      : T extends 7
        ? 6
        : T extends 6
          ? 5
          : T extends 5
            ? 4
            : T extends 4
              ? 3
              : T extends 3
                ? 2
                : T extends 2
                  ? 1
                  : T extends 1
                    ? 0
                    : 0

export type MergeGLSLSchema<
  TVertex extends ViewSchema,
  TFragment extends ViewSchema,
  TOverrides extends ViewSchemaPartial | undefined = {},
> = TOverrides extends ViewSchemaPartial
  ? {
      uniforms: Prettify<
        DeepMerge<
          [ShallowMerge<[TVertex['uniforms'], TFragment['uniforms']]>, TOverrides['uniforms']]
        >
      >
      attributes: Prettify<
        DeepMerge<
          [ShallowMerge<[TVertex['attributes'], TFragment['attributes']]>, TOverrides['attributes']]
        >
      >
      interleavedAttributes: Prettify<
        DeepMerge<
          [
            ShallowMerge<[TVertex['interleavedAttributes'], TFragment['interleavedAttributes']]>,
            TOverrides['interleavedAttributes'],
          ]
        >
      >
    }
  : {
      uniforms: Prettify<ShallowMerge<[TVertex['uniforms'], TFragment['uniforms']]>>
      attributes: Prettify<ShallowMerge<[TVertex['attributes'], TFragment['attributes']]>>
      interleavedAttributes: Prettify<
        ShallowMerge<[TVertex['interleavedAttributes'], TFragment['interleavedAttributes']]>
      >
    }

export type CompileResult<
  TVertex extends GLSL,
  TFragment extends GLSL,
  TOverrideSchema extends ViewSchemaPartial | undefined,
> =
  MergeGLSLSchema<
    GLSLToSchema<TVertex>,
    GLSLToSchema<TFragment>,
    TOverrideSchema
  > extends infer TSchema extends ViewSchema
    ? {
        program: WebGLProgram
        schema: TSchema
        view: Prettify<View<TSchema>>
        vertex: string
        fragment: string
      }
    : never
