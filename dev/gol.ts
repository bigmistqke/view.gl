import { FramebufferOptions } from 'src/types'
import { framebufferView, view } from 'view.gl'
import { attribute, compile, glsl, uniform } from 'view.gl/tag'

const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl', { antialias: false })!
if (!gl) {
  throw new Error('WebGL not supported')
}
document.body.append(canvas)

canvas.width = 256 * 2
canvas.height = 256 * 2
const WIDTH = canvas.width
const HEIGHT = canvas.height

// --- Shaders ---

// Vertex shader (simple fullscreen quad)
const vertex = glsl`
  ${attribute.vec2('a_vertex')};
  varying vec2 v_uv;
  void main() {
    v_uv = (a_vertex + 1.0) * 0.5;
    gl_Position = vec4(a_vertex, 0, 1);
  }
`

// Fragment shader for Game of Life step
// We read from u_texture the current state
// Alive cells are red > 0.5, dead < 0.5
// Compute neighbors, apply rules, output next state (red channel)
const stepFragment = glsl`
  precision mediump float;
  varying vec2 v_uv;
  ${uniform.sampler2D('u_texture')};
  ${uniform.vec2('u_texelSize')};

  int getCell(vec2 uv) {
    // Wrap around (toroidal)
    uv = mod(uv, 1.0);
    float val = texture2D(u_texture, uv).r;
    return int(step(0.5, val));
  }

  void main() {
    int sum = 0;
    // Iterate neighbors -1,0,1
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        sum += getCell(v_uv + vec2(float(x), float(y)) * u_texelSize);
      }
    }
    int current = getCell(v_uv);

    int nextState = 0;
    if (current == 1) {
      if (sum == 2 || sum == 3) nextState = 1;
      else nextState = 0;
    } else {
      if (sum == 3) nextState = 1;
      else nextState = 0;
    }

    gl_FragColor = vec4(float(nextState), 0.0, 0.0, 1.0);
  }`

// Fragment shader for rendering the state texture to screen
const renderFragment = glsl`
  precision mediump float;
  varying vec2 v_uv;
  ${uniform.sampler2D('u_texture')};
  
  void main() {
    float cell = texture2D(u_texture, v_uv * 0.5).r;
    gl_FragColor = vec4(vec3(cell), 1.0);
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

// Setup quad
stepView.attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]))

// Initialize two framebuffers (with their respective texture) for ping-pong
const textureOptions = {
  attachment: 'color',
  width: WIDTH,
  height: HEIGHT,
  type: 'UNSIGNED_BYTE',
} satisfies FramebufferOptions

let { read, write } = framebufferView(gl, { read: textureOptions, write: textureOptions })

// --- Initialize state texture (random live/dead) ---
gl.bindTexture(gl.TEXTURE_2D, read.texture)
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  0,
  0,
  WIDTH,
  HEIGHT,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  new Uint8Array(
    (function* () {
      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        const alive = Math.random() < 0.25 ? 255 : 0 // 25% chance alive
        yield alive // red channel = alive
        yield 0
        yield 0
        yield 255 // opaque
      }
    })(),
  ),
)

function step() {
  // Run Game of Life step: render to write-feedbackBuffer using read-texture as input
  write.bind()

  gl.viewport(0, 0, WIDTH, HEIGHT)
  gl.useProgram(stepProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, read.texture)

  stepView.uniforms.u_texture.set(0)
  stepView.uniforms.u_texelSize.set(1 / WIDTH, 1 / HEIGHT)

  stepView.attributes.a_vertex.bind()

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // Now render to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.useProgram(renderProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, write.texture)
  renderView.uniforms.u_texture.set(0)

  renderView.attributes.a_vertex.bind()

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // Swap read and write buffers and textures
  ;[read, write] = [write, read]
}

function animate() {
  step()
  requestAnimationFrame(animate)
}
animate()
