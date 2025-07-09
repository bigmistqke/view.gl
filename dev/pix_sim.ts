import { FramebufferOptions } from 'src/types'
import { createFramebuffer } from 'src/utils'
import { view } from 'view.gl'
import { attribute, compile, glsl, uniform } from 'view.gl/tag'

export const MATERIALS = {
  SAND: {
    color: [0, 1, 1],
  },
} as const

const MATERIAL_SIZE = Object.keys(MATERIALS).length

let playing = false

const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl2', { antialias: false })!
if (!gl) {
  throw new Error('WebGL not supported')
}
document.body.append(canvas)

function spray() {
  return Math.floor(Math.random() * 8) * (Math.random() < 0.5 ? 1 : -1)
}

canvas.addEventListener('mousedown', event => {
  const rect = canvas.getBoundingClientRect()
  const controller = new AbortController()
  playing = false
  window.addEventListener(
    'mousemove',
    event => {
      const x = Math.floor((event.clientX - rect.left + spray()) * (canvas.width / rect.width))
      const y = Math.floor((rect.bottom - event.clientY + spray()) * (canvas.height / rect.height))

      const dimensions = [8, 8] as const

      // Encode sand material (MAT_SAND = 1 = 001 in binary)
      const data = new Uint8Array(
        (function* () {
          for (let i = 0; i < dimensions[0] * dimensions[1]; i++) {
            yield 255 // Red channel (bit 0 = 1)
            yield 0 // Green channel (bit 1 = 0)
            yield 0 // Blue channel (bit 2 = 0)
            yield 255 // Alpha channel
          }
        })(),
      )

      // Update both read and write textures
      gl.bindTexture(gl.TEXTURE_2D, read.texture)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        Math.max(0, Math.min(WIDTH - dimensions[0], x)),
        Math.max(0, Math.min(HEIGHT - dimensions[1], y)),
        dimensions[0],
        dimensions[1],
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data,
      )

      gl.bindTexture(gl.TEXTURE_2D, write.texture)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        Math.max(0, Math.min(WIDTH - dimensions[0], x)),
        Math.max(0, Math.min(HEIGHT - dimensions[1], y)),
        dimensions[0],
        dimensions[1],
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data,
      )

      render()
    },
    controller,
  )
  window.addEventListener(
    'mouseup',
    () => {
      controller.abort()
      playing = true
      animate()
    },
    controller,
  )
})

canvas.width = 256 * 2
canvas.height = 256 * 2
const WIDTH = canvas.width
const HEIGHT = canvas.height

// --- Shaders ---

// Vertex shader (simple fullscreen quad)
const vertex = glsl`#version 300 es
${attribute.vec2('a_vertex')}
out vec2 v_uv;
void main() {
  v_uv = a_vertex * 0.5 + 0.5;
  gl_Position = vec4(a_vertex, 0, 1);
}`

// Fragment shader for sand simulation step
const stepFragment = glsl`#version 300 es
precision highp float;
in vec2 v_uv;
${uniform.sampler2D('u_texture')}
${uniform.vec2('u_texelSize')}
out vec4 fragColor;

// Material constants (like enums)
const int MAT_EMPTY = 0;
const int MAT_SAND = 1;
const int MAT_WATER = 2;
const int MAT_STONE = 3;

// Direction constants
const vec2 DIR_UP = vec2(0.0, 1.0);
const vec2 DIR_DOWN = vec2(0.0, -1.0);
const vec2 DIR_LEFT = vec2(-1.0, 0.0);
const vec2 DIR_RIGHT = vec2(1.0, 0.0);

// Helper function to decode material from RGB
int getMaterial(vec4 color) {
  return int(color.r + color.g * 2.0 + color.b * 4.0);
}

// Helper function to encode material to RGB
vec4 encodeMaterial(int material) {
  return vec4(
    float(material & 1),
    float((material >> 1) & 1),
    float((material >> 2) & 1),
    1.0
  );
}

void main() {
  // Sample the current state
  vec4 current = texture(u_texture, v_uv);
  
  // Sample neighbors
  vec4 above = texture(u_texture, v_uv + DIR_UP * u_texelSize);
  vec4 below = texture(u_texture, v_uv + DIR_DOWN * u_texelSize);
  vec4 aboveLeft = texture(u_texture, v_uv + (DIR_UP + DIR_LEFT) * u_texelSize);
  vec4 aboveRight = texture(u_texture, v_uv + (DIR_UP + DIR_RIGHT) * u_texelSize);
  vec4 belowLeft = texture(u_texture, v_uv + (DIR_DOWN + DIR_LEFT) * u_texelSize);
  vec4 belowRight = texture(u_texture, v_uv + (DIR_DOWN + DIR_RIGHT) * u_texelSize);
  
  // Check boundaries
  bool atBottom = v_uv.y - u_texelSize.y < 0.0;
  bool atLeft = v_uv.x - u_texelSize.x < 0.0;
  bool atRight = v_uv.x + u_texelSize.x > 1.0;
  bool atTop = v_uv.y + u_texelSize.y > 1.0;
  
  // Default: keep current state
  fragColor = current;

  int material = getMaterial(current);
  int matBelow = getMaterial(below);
  int matAbove = getMaterial(above);
  int matAboveLeft = getMaterial(aboveLeft);
  int matAboveRight = getMaterial(aboveRight);
  int matBelowLeft = getMaterial(belowLeft);
  int matBelowRight = getMaterial(belowRight);
  
  // Physics simulation using switch
  switch (material) {
    case MAT_EMPTY:
      // This pixel is empty - check what can fall into it
      if (!atTop && matAbove == MAT_SAND) {
        // Sand from directly above
        fragColor = encodeMaterial(MAT_SAND);
      } else if (!atTop && !atRight && matAboveLeft == MAT_SAND) {
        // Sand sliding from above-left
        vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
        if (getMaterial(left) != MAT_EMPTY || atBottom) {
          fragColor = encodeMaterial(MAT_SAND);
        }
      } else if (!atTop && !atLeft && matAboveRight == MAT_SAND) {
        // Sand sliding from above-right
        vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
        if (getMaterial(right) != MAT_EMPTY || atBottom) {
          fragColor = encodeMaterial(MAT_SAND);
        }
      }
      break;
      
    case MAT_SAND:
      // Sand particle - check if it should fall
      if (!atBottom && matBelow == MAT_EMPTY) {
        // Fall straight down
        fragColor = encodeMaterial(MAT_EMPTY);
      } else if (!atBottom && !atLeft && matBelowLeft == MAT_EMPTY) {
        // Slide down-left
        fragColor = encodeMaterial(MAT_EMPTY);
      } else if (!atBottom && !atRight && matBelowRight == MAT_EMPTY) {
        // Slide down-right
        fragColor = encodeMaterial(MAT_EMPTY);
      }
      break;
      
    case MAT_WATER:
      // Future: Water physics
      break;
      
    case MAT_STONE:
      // Stone doesn't move
      break;
      
    default:
      // Unknown material - keep as is
      break;
  }
}`

// Fragment shader for rendering the state texture to screen
const renderFragment = glsl`#version 300 es
precision mediump float;
in vec2 v_uv;
${uniform.sampler2D('u_texture')}
${uniform.vec3('u_palette', { size: MATERIAL_SIZE })}
out vec4 fragColor;

// Material constants (must match stepFragment)
const int MAT_EMPTY = 0;
const int MAT_SAND = 1;
const int MAT_WATER = 2;
const int MAT_STONE = 3;

// Helper function to decode material from RGB
int getMaterial(vec4 color) {
  return int(color.r + color.g * 2.0 + color.b * 4.0);
}

void main() {
  vec4 texel = texture(u_texture, v_uv);
  int material = getMaterial(texel);
  
  if (material == MAT_EMPTY) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black background
  } else if (material > 0 && material <= ${MATERIAL_SIZE}) {
    fragColor = vec4(u_palette[material - 1], 1.0);
  } else {
    fragColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta for unknown materials
  }
}`

// --- Create programs ---
const { program: stepProgram, schema: stepSchema } = compile(gl, vertex, stepFragment)
const stepView = view(gl, stepProgram, stepSchema)

const { program: renderProgram, schema: renderSchema } = compile(gl, vertex, renderFragment)
const renderView = view(gl, renderProgram, {
  ...renderSchema,
  attributes: {
    ...renderSchema.attributes,
    a_vertex: {
      ...renderSchema.attributes.a_vertex,
      buffer: stepView.attributes.a_vertex.buffer,
    },
  },
})

gl.useProgram(renderProgram)
renderView.uniforms.u_palette.set(
  new Float32Array(Object.values(MATERIALS).flatMap(({ color }) => color)),
)

gl.useProgram(stepProgram)
// Setup quad
stepView.attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]))

// Initialize two framebuffers (with their respective texture) for ping-pong
const framebufferOptions = {
  attachment: 'color',
  width: WIDTH,
  height: HEIGHT,
  type: 'UNSIGNED_BYTE',
  magFilter: 'NEAREST',
  minFilter: 'NEAREST',
  internalFormat: 'RGBA',
  format: 'RGBA',
} satisfies FramebufferOptions

let read = createFramebuffer(gl, framebufferOptions)
let write = createFramebuffer(gl, framebufferOptions)

// Initialize state texture (empty)
const initData = new Uint8Array(
  (function* () {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      yield 0 // Red channel (material ID)
      yield 0 // Green channel
      yield 0 // Blue channel
      yield 255 // Alpha channel
    }
  })(),
)

gl.bindTexture(gl.TEXTURE_2D, read.texture)
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, initData)

gl.bindTexture(gl.TEXTURE_2D, write.texture)
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, initData)

function step() {
  // Run sand simulation step: render to write-framebuffer using read-texture as input
  gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer)
  gl.viewport(0, 0, WIDTH, HEIGHT)
  gl.useProgram(stepProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, read.texture)

  stepView.uniforms.u_texture.set(0)
  stepView.uniforms.u_texelSize.set(1 / WIDTH, 1 / HEIGHT)

  stepView.attributes.a_vertex.bind()
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function render() {
  // Render to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.useProgram(renderProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, write.texture)

  renderView.uniforms.u_texture.set(0)
  renderView.attributes.a_vertex.bind()

  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function animate() {
  if (playing) {
    step()
    render()
    // Swap read and write buffers
    ;[read, write] = [write, read]
    requestAnimationFrame(animate)
  }
}

// Add some initial sand for testing
gl.bindTexture(gl.TEXTURE_2D, read.texture)
const testData = new Uint8Array([255, 0, 0, 255]) // One sand pixel (MAT_SAND = 1)
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  WIDTH / 2,
  HEIGHT - 100,
  1,
  1,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  testData,
)

// Start animation
playing = true
animate()
