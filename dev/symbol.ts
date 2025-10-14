import { attribute, compile, glsl, uniform } from 'view.gl/tag'
import { view } from '../src'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.append(canvas)

const gl = canvas.getContext('webgl2')!
gl.viewport(0, 0, canvas.width, canvas.height)

const vertex = glsl`
precision mediump float;

${attribute.vec2('a_vertex')}
${uniform.float('u_time')}

void main() {
  float s = sin(u_time);
  float c = cos(u_time);
  mat2 rotation = mat2(
    c, -s,
    s,  c
  );
  vec2 position = a_vertex * rotation;
  gl_Position = vec4(position, 0.0,  1.0);
}`

const u_color_symbol = Symbol('a_color')

const fragment = glsl`
precision mediump float;

${uniform.vec3(u_color_symbol)}

void main() {
  gl_FragColor = vec4(${u_color_symbol}, 1.0);
}`

const { program, schema } = compile(gl, vertex, fragment)
const {
  attributes: { a_vertex },
  uniforms: { [u_color_symbol]: u_color, u_time },
} = view(gl, program, schema)

gl.useProgram(program)

u_color.set(0, 255, 0)

// Create triangle vertex buffer
a_vertex
  .set(
    new Float32Array([
      // top
      0.0, 1.0,
      // bottom left
      -1.0, -1.0,
      // bottom right
      1.0, -1.0,
    ]),
  )
  .bind()

requestAnimationFrame(function draw(delta: number) {
  requestAnimationFrame(draw)

  // Set uniform
  u_time.set(delta / 1_000)

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100)
})
