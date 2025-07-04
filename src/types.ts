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

type UniformKind = '1f' | '2f' | '3f' | '4f' | '1i' | '2i' | '3i' | '4i' | 'mat3' | 'mat4'

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

export type InferUniformSetters<T extends UniformConfig | undefined> = T extends UniformConfig
  ? {
      [K in keyof T]: {
        set(...args: UniformKindMap[T[K]]): void
      }
    }
  : undefined

export type InferUniforms<T extends UniformConfig | undefined> = T extends UniformConfig
  ? {
      dispose(): void
      setters: InferUniformSetters<T>
    }
  : undefined

/**********************************************************************************/
/*                                                                                */
/*                                   Attributes                                   */
/*                                                                                */
/**********************************************************************************/

export type AttributeKind = '1f' | '2f' | '3f' | '4f'

type BufferData = Float32Array | WebGLBuffer

export type InterleaveAttributes<T extends AttributeConfig | undefined> = T extends AttributeConfig
  ? {
      set(buffer: Float32Array): void
      bind(instancing: boolean): void
    }
  : undefined
export type InferAttributeSetters<T extends AttributeConfig | undefined> = T extends AttributeConfig
  ? {
      [K in keyof T]: {
        bind(data: Float32Array): void
        set(instancing: boolean): void
      }
    }
  : undefined
export type InferAttributes<T extends AttributeConfig | undefined> = T extends AttributeConfig
  ? {
      interleave(layout: Array<string>): InterleaveAttributes<T>
      dispose(): void
      setters: InferAttributeSetters<T>
    }
  : undefined

/**********************************************************************************/
/*                                                                                */
/*                                Instanced Attributes                            */
/*                                                                                */
/**********************************************************************************/

export type InferInstancedAttributeSetter<T extends AttributeConfig | undefined> =
  T extends AttributeConfig ? (buffer: BufferData) => void : undefined
export type InferInstancedAttributes<T extends AttributeConfig | undefined> =
  T extends AttributeConfig
    ? {
        set: InferInstancedAttributeSetter<T>
        dispose(): void
      }
    : undefined

/**********************************************************************************/
/*                                                                                */
/*                                     Buffers                                    */
/*                                                                                */
/**********************************************************************************/

export type InferBufferSetters<T extends BufferConfig | undefined> = T extends BufferConfig
  ? {
      [K in keyof T['buffers']]: {
        set(data: Float32Array | Uint16Array | Uint32Array): WebGLBuffer
        get(): WebGLBuffer
        bind(): Program<T>
      }
    }
  : undefined
export type InferBuffers<T extends BufferConfig | undefined> = T extends BufferConfig
  ? {
      dispose(): void
      setters: InferBufferSetters<T>
    }
  : undefined

/**********************************************************************************/
/*                                                                                */
/*                                    Textures                                    */
/*                                                                                */
/**********************************************************************************/

export type InferTextureSetters<T extends TextureConfig | undefined> = T extends TextureConfig
  ? {
      [K in keyof T]: {
        set(data?: ArrayBufferView | null): WebGLTexture
        get(): WebGLTexture
        bind(unit?: number): Program<T>
        update(
          x: number,
          y: number,
          width: number,
          height: number,
          data: ArrayBufferView,
        ): Program<T>
      }
    }
  : undefined
export type InferTextures<T extends TextureConfig | undefined> = T extends TextureConfig
  ? {
      dispose(): void
      setters: InferTextureSetters<T>
    }
  : undefined

/**********************************************************************************/
/*                                                                                */
/*                                   Framebuffers                                 */
/*                                                                                */
/**********************************************************************************/

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

export type InferFramebufferSetters<T extends ProgramConfig['framebuffers']> =
  T extends NonNullable<ProgramConfig['framebuffers']>
    ? {
        [K in keyof T]: {
          bind(): Program<T>
          unbind(): Program<T>
          get(): WebGLFramebuffer
          getTexture(): WebGLTexture | undefined
          checkStatus(): boolean
        }
      }
    : undefined
export type InferFramebuffers<T extends ProgramConfig['framebuffers']> = T extends NonNullable<
  ProgramConfig['framebuffers']
>
  ? {
      dispose(): void
      setters: InferFramebufferSetters<T>
    }
  : undefined

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

type UniformConfig = Record<string, UniformKind>
type AttributeConfig = Record<string, AttributeKind>
type BufferConfig = Record<string, BufferOptions>
type TextureConfig = Record<string, TextureOptions>
type FramebufferConfig = Record<string, FramebufferOptions>
export interface ProgramConfig {
  uniforms?: UniformConfig
  attributes?: AttributeConfig
  instancedAttributes?: AttributeConfig
  buffers?: BufferConfig
  textures?: TextureConfig
  framebuffers?: FramebufferConfig
}

/**********************************************************************************/
/*                                                                                */
/*                                   Program State                                */
/*                                                                                */
/**********************************************************************************/

export type ProgramState =
  | {
      gl: WebGLRenderingContext
      isWebGL2: false
      program: WebGLProgram
      vertexArrayObject?: never
      instancedArraysExt: ANGLE_instanced_arrays | null
    }
  | {
      gl: WebGL2RenderingContext
      isWebGL2: true
      program: WebGLProgram
      vertexArrayObject: WebGLVertexArrayObject
      instancedArraysExt?: never
    }

/**********************************************************************************/
/*                                                                                */
/*                                     Program                                    */
/*                                                                                */
/**********************************************************************************/

export interface Program<T extends ProgramConfig = ProgramConfig> {
  dispose(): void
  drawArrays(mode: number, first: number, count: number): void
  drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void
  drawElements(mode: number, count: number, type: number, offset: number): void
  drawElementsInstanced(
    mode: number,
    count: number,
    type: number,
    offset: number,
    instanceCount: number,
  ): void
  attributes: InferAttributeSetters<T['attributes']>
  interleaveAttributes: InterleaveAttributes<T['attributes']>
  buffers: InferBufferSetters<T['buffers']>
  framebuffers: InferFramebufferSetters<T['framebuffers']>
  textures: InferTextureSetters<T['textures']>
  uniforms: InferUniformSetters<T['uniforms']>
  use(): void
}
