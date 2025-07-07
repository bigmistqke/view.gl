import { attribute, compile, glsl, interleave, uniform } from 'view.gl/tag'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.append(canvas)

const gl = canvas.getContext('webgl2')!
gl.viewport(0, 0, canvas.width, canvas.height)

const vertex = glsl`
precision mediump float;

${interleave('instancedData', [attribute.vec2('a_pos'), attribute.vec3('a_color')], true)}
${attribute.vec2('a_vertex', false)}
${uniform.float('u_time')}

varying vec3 v_color;

void main() {
  float s = sin(u_time);
  float c = cos(u_time);
  mat2 rotation = mat2(
    c, -s,
    s,  c
  );
  vec2 position = a_pos + a_vertex * rotation;
  gl_Position = vec4(position, 0.0,  1.0);

  v_color = a_color;
}`

const fragment = glsl`
precision mediump float;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}`

const {
  program,
  attributes: { a_vertex },
  uniforms: { u_time },
  interleavedAttributes: { instancedData },
} = compile(gl, vertex, fragment)

instancedData.set(
  new Float32Array(
    (function* () {
      for (let i = 0; i < 100; i++) {
        // Position
        yield (Math.random() - 0.5) * 2
        yield (Math.random() - 0.5) * 2

        // Color
        yield Math.random()
        yield Math.random()
        yield Math.random()
      }
    })(),
  ),
)

instancedData.bind() // Upload interleaved buffer

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

gl.useProgram(program)

requestAnimationFrame(function draw(delta: number) {
  requestAnimationFrame(draw)

  // Set uniform
  u_time.set(delta / 1_000)

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100)
})
