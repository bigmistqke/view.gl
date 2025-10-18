import { FramebufferDefinition } from 'src/types'
import { createFramebuffer } from 'src/utils'
import { attribute, compile, glsl, uniform } from 'view.gl/tag'
import { dom } from '../utils'

let playing = false

const canvas = dom('canvas')
const gl = canvas.getContext('webgl', { antialias: false })!
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
      const x = Math.floor((event.clientX - rect.left - spray()) * (canvas.width / rect.width))
      const y = Math.floor((rect.bottom - event.clientY - spray()) * (canvas.height / rect.height))

      const dimensions = [2, 2] as const

      // Set red=255, alive; other channels remain 0/255
      const data = new Uint8Array(
        (function* () {
          for (let i = 0; i < dimensions[0] * dimensions[1]; i++) {
            yield 255
            yield 0
            yield 0
            yield 255
          }
        })(),
      )

      gl.bindTexture(gl.TEXTURE_2D, read.texture)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        x,
        y,
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
        x,
        y,
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
const vertex = glsl`
  ${attribute.vec2('a_vertex')}
  varying vec2 v_uv;
  void main() {
    v_uv = a_vertex * 0.5 + 0.5;
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
  ${uniform.sampler2D('u_texture')}
  ${uniform.vec2('u_texelSize')}

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
  ${uniform.sampler2D('u_texture')}
  
  void main() {
    float cell = texture2D(u_texture, v_uv).r;
    gl_FragColor = vec4(vec3(cell), 1.0);
  }`

// --- Create programs ---
const { program: stepProgram, view: stepView } = compile(gl, vertex, stepFragment)
const { program: renderProgram, view: renderView } = compile(gl, vertex, renderFragment, {
  attributes: {
    a_vertex: {
      buffer: stepView.attributes.a_vertex.buffer,
    },
  },
})

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
} satisfies FramebufferDefinition

let read = createFramebuffer(gl, framebufferOptions)
let write = createFramebuffer(gl, framebufferOptions)

// Initialize state texture (random live/dead)
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
        yield 0
        yield 0
        yield 0
        yield 255
      }
    })(),
  ),
)

function step() {
  // Run Game of Life step: render to write-feedbackBuffer using read-texture as input
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
  // Now render to screen
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
    // Swap read and write buffers and textures
    ;[read, write] = [write, read]
    requestAnimationFrame(animate)
  }
}
playing = true
animate()
