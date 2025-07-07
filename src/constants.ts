export const KIND_TO_UNIFORM_FN_NAME = {
  // Floats (WebGL1 + WebGL2)
  float: '1f',
  vec2: '2f',
  vec3: '3f',
  vec4: '4f',

  // Signed Integers (WebGL1 + WebGL2)
  int: '1i',
  ivec2: '2i',
  ivec3: '3i',
  ivec4: '4i',

  // Matrices (WebGL1 + WebGL2)
  mat2: 'Matrix2fv',
  mat3: 'Matrix3fv',
  mat4: 'Matrix4fv',

  // Unsigned Integers (WebGL2 only)
  uint: '1ui',
  uvec2: '2ui',
  uvec3: '3ui',
  uvec4: '4ui',

  // WebGL2 extended matrix types
  mat2x3: 'Matrix2x3fv',
  mat2x4: 'Matrix2x4fv',
  mat3x2: 'Matrix3x2fv',
  mat3x4: 'Matrix3x4fv',
  mat4x2: 'Matrix4x2fv',
  mat4x3: 'Matrix4x3fv',

  // Booleans — GLSL booleans are set with uniform1i
  bool: '1i',
  bvec2: '2i',
  bvec3: '3i',
  bvec4: '4i',

  // Samplers — all use 1i to bind texture unit indices
  sampler2D: '1i',
  samplerCube: '1i',
  sampler2DArray: '1i',
  sampler3D: '1i', // WebGL2
  sampler2DShadow: '1i', // WebGL2
  samplerCubeShadow: '1i', // WebGL2
  sampler2DArrayShadow: '1i', // WebGL2

  // Integer samplers (WebGL2)
  isampler2D: '1i',
  isampler3D: '1i',
  isamplerCube: '1i',
  isampler2DArray: '1i',

  // Unsigned integer samplers (WebGL2)
  usampler2D: '1i',
  usampler3D: '1i',
  usamplerCube: '1i',
  usampler2DArray: '1i',
} as const

export const KIND_SIZE_MAP = {
  // Floats
  float: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,

  // Signed integers
  int: 1,
  ivec2: 2,
  ivec3: 3,
  ivec4: 4,

  // Booleans (set as ints)
  bool: 1,
  bvec2: 2,
  bvec3: 3,
  bvec4: 4,

  // Unsigned integers (WebGL2)
  uint: 1,
  uvec2: 2,
  uvec3: 3,
  uvec4: 4,

  // Matrices
  mat2: 4,
  mat3: 9,
  mat4: 16,
  mat2x3: 6,
  mat2x4: 8,
  mat3x2: 6,
  mat3x4: 12,
  mat4x2: 8,
  mat4x3: 12,

  // Samplers (texture unit indices)
  sampler2D: 1,
  samplerCube: 1,
  sampler3D: 1,
  sampler2DArray: 1,
  sampler2DShadow: 1,
  samplerCubeShadow: 1,
  sampler2DArrayShadow: 1,

  // Integer samplers (WebGL2)
  isampler2D: 1,
  isampler3D: 1,
  isamplerCube: 1,
  isampler2DArray: 1,

  // Unsigned integer samplers (WebGL2)
  usampler2D: 1,
  usampler3D: 1,
  usamplerCube: 1,
  usampler2DArray: 1,
} as const

export const FRAMEBUFFER_ATTACHMENT_MAP = {
  color: 'COLOR_ATTACHMENT0',
  depth: 'DEPTH_ATTACHMENT',
  stencil: 'STENCIL_ATTACHMENT',
  depthStencil: 'DEPTH_STENCIL_ATTACHMENT',
} as const
