import { a as attribute, g as glsl, u as uniform, c as compile } from './tag-EKqfZT7t.js';
import { d as dom } from './utils-2dzuv_bW.js';

function createModule(callback) {
  const symbol = Symbol();
  return {
    pointer: symbol,
    module: callback(symbol)
  };
}
const controller = new AbortController();
const canvas = dom("canvas", { parentElement: document.body });
const gl = canvas.getContext("webgl2");
gl.viewport(0, 0, canvas.width, canvas.height);
new ResizeObserver(() => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  draw(performance.now());
}).observe(canvas);
const circle = createModule(
  (symbol) => glsl`
${uniform.vec2("u_base")}

bool ${symbol}(vec2 position){
  return distance(position + u_base, vec2(0., 0.)) < 1.0;
}`
);
const vertex = glsl`
precision mediump float;

${attribute.vec2("a_vertex")}

varying vec2 position;

void main() {
  position = a_vertex;
  gl_Position = vec4(position, 0.0,  1.0);
}`;
const fragment = glsl`
precision mediump float;
varying vec2 position;
${uniform.vec3("u_color")}

${circle.module}

void main() {
  if(${circle.pointer}(position) == false){
    discard;
  }
  gl_FragColor = vec4(${"u_color"}, 1.0);
}`;
const {
  program,
  view: { attributes, uniforms }
} = compile(gl, vertex, fragment);
gl.useProgram(program);
uniforms.u_color.set(0, 255, 0);
uniforms.u_base.set(1, 1);
attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])).bind();
function draw(delta) {
  if (controller.signal.aborted) return;
  requestAnimationFrame(draw);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 100);
}
requestAnimationFrame(draw);
