import { attribute, compile, glsl, uniform } from 'view.gl/tag'
import { GLSLToken, GLSLToView, View } from '../../../src'
import { dom } from '../utils'

function createModule<TTag>(callback: (symbol: symbol) => TTag) {
  const symbol = Symbol()
  return {
    pointer: symbol,
    module: callback(symbol),
  }
}
const controller = new AbortController()
const canvas = dom('canvas', { parentElement: document.body }) // (<canvas />) as HTMLCanvasElement;

const gl = canvas.getContext('webgl2')!
gl.viewport(0, 0, canvas.width, canvas.height)

new ResizeObserver(() => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  gl.viewport(0, 0, canvas.width, canvas.height)
  draw(performance.now())
}).observe(canvas)

const circle = createModule(
  symbol => glsl`
${uniform.vec2('u_base')}

bool ${symbol}(vec2 position){
  return distance(position + u_base, vec2(0., 0.)) < 1.0;
}`,
)

const vertex = glsl`
precision mediump float;

${attribute.vec2('a_vertex')}

varying vec2 position;

void main() {
  position = a_vertex;
  gl_Position = vec4(position, 0.0,  1.0);
}`

const fragment = glsl`
precision mediump float;
varying vec2 position;
${uniform.vec3('u_color')}

${circle.module}

void main() {
  if(${circle.pointer}(position) == false){
    discard;
  }
  gl_FragColor = vec4(${'u_color'}, 1.0);
}`

const {
  program,
  view: { attributes, uniforms },
} = compile(gl, vertex, fragment)

gl.useProgram(program)

uniforms.u_color.set(0, 255, 0)

uniforms.u_base.set(1, 1)

// Create triangle vertex buffer
attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])).bind()

function draw(delta: number) {
  if (controller.signal.aborted) return
  requestAnimationFrame(draw)
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 100)
}
requestAnimationFrame(draw)

abstract class Module {
  symbol = Symbol()
  abstract view?: View
  abstract template: GLSLToken
}

class CircleModule extends Module {
  view?: GLSLToView<typeof this.template>
  base = Symbol()
  template = glsl`
${uniform.vec2(this.base)}    
bool ${this.symbol}(vec2 position){
  return distance(position + ${this.base}, vec2(0., 0.)) < 1.0;
}`
  setBase(x: number, y: number) {
    this.view?.uniforms[this.base]?.set(x, y)
  }
}
