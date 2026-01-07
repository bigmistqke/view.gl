import { g as glsl, u as uniform, a as attribute, c as compile } from './tag-BxfPhdBI.js';
import { d as dom } from './utils-2dzuv_bW.js';

const canvas = dom("canvas", {
  width: window.innerWidth,
  height: window.innerHeight,
  parentElement: document.body,
  style: { width: "100%" }
});
const gl = canvas.getContext("webgl2");
gl.viewport(0, 0, canvas.width, canvas.height);
console.log("gl is", gl);
const mathUtils = glsl`
  float wave(float x, float speed, float frequency) {
    return sin(x * frequency + u_time * speed);
  }
`;
const transforms = glsl`
  ${uniform.float("u_time")}
  ${mathUtils}
  
  mat2 rotation2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }
`;
const colors = glsl`
  ${uniform.vec3("u_color")}
  
  vec3 rainbow(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }
`;
const vertex = glsl`
  precision highp float;
  
  ${attribute.vec2("a_position")}
  ${transforms}
  
  void main() {
    vec2 pos = a_position;
    
    // Rotate based on time
    float angle = u_time;
    pos = rotation2D(angle) * pos;
    
    // Add wave motion
    pos.y += wave(pos.x, 2.0, 5.0) * 0.1;
    
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;
const fragment = glsl`
  precision highp float;
  
  ${colors}
  ${[uniform.float("u_time")]}
  
  void main() {
    // Animated rainbow color
    vec3 color = rainbow(u_time * 0.5);
    
    // Mix with base color
    color = mix(u_color, color, 0.7);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;
const {
  program,
  view: { attributes, uniforms }
} = compile(gl, vertex, fragment);
gl.useProgram(program);
uniforms.u_color.set(1, 0.5, 0.2);
attributes.a_position.set(
  new Float32Array([
    // Triangle
    0,
    0.5,
    // top
    -0.5,
    -0.5,
    // bottom left
    0.5,
    -0.5
    // bottom right
  ])
).bind();
function draw(delta) {
  requestAnimationFrame(draw);
  uniforms.u_time.set(delta / 1e3);
  gl.clearColor(0.1, 0.1, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
requestAnimationFrame(draw);
