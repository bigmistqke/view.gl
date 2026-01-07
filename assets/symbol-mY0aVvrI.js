import { a as attribute, u as uniform, g as glsl, c as compile } from './tag-EKqfZT7t.js';
import { d as dom } from './utils-2dzuv_bW.js';

const canvas = dom("canvas", {
  width: window.innerWidth,
  height: window.innerHeight,
  parentElement: document.body,
  style: "width: 100%; height: 100%"
});
new ResizeObserver(() => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  draw(performance.now());
}).observe(canvas);
const gl = canvas.getContext("webgl2");
gl.viewport(0, 0, canvas.width, canvas.height);
const vertex = glsl`
precision mediump float;

${attribute.vec2("a_vertex")}
${uniform.float("u_time")}

void main() {
  float s = sin(u_time);
  float c = cos(u_time);
  mat2 rotation = mat2(
    c, -s,
    s,  c
  );
  vec2 position = a_vertex * rotation;
  gl_Position = vec4(position, 0.0,  1.0);
}`;
const u_color = Symbol("color");
const fragment = glsl`
precision mediump float;

${uniform.vec3(u_color)}

void main() {
  gl_FragColor = vec4(${u_color}, 1.0);
}`;
const {
  program,
  view: { attributes, uniforms }
} = compile(gl, vertex, fragment);
gl.useProgram(program);
uniforms[u_color].set(0, 255, 0);
attributes.a_vertex.set(
  new Float32Array([
    // top
    0,
    1,
    // bottom left
    -1,
    -1,
    // bottom right
    1,
    -1
  ])
).bind();
function draw(delta) {
  requestAnimationFrame(draw);
  uniforms.u_time.set(delta / 1e3);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, 100);
}
requestAnimationFrame(draw);
