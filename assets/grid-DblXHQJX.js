import { a as attribute, u as uniform, g as glsl, c as compile, v as view } from './tag-Ahw-5sKJ.js';
import { c as createElement, a as cursor } from './utils-CvCgsM08.js';

const canvas = createElement("canvas", { width: window.innerWidth, height: window.innerHeight });
const gl = canvas.getContext("webgl2", { antialias: false });
if (!gl) {
  throw new Error("WebGL not supported");
}
const state = {
  position: { x: 0, y: 0 },
  scale: 1,
  elements: []
};
const container = createElement("div");
state.elements.push(createGridElement({ x: 100, y: 100 }));
function createGridElement(position = { x: 0, y: 0 }) {
  position = {
    x: (position.x - state.position.x) / state.scale,
    y: (position.y - state.position.y) / state.scale
  };
  const element = createElement("div", {
    innerText: "HALLO WORLD",
    style: `position: fixed; 
z-index: 10; 
left: 0px; 
top: 0px; 
transform-origin: top left; 
background: white; 
padding: 2px; 
border-radius: 2px;`,
    parentElement: container
  });
  function update() {
    element.style.transform = `translate3d(${state.position.x + position.x * state.scale}px,${state.position.y + position.y * state.scale}px,0) scale(${state.scale})`;
  }
  update();
  return {
    element,
    position,
    update
  };
}
canvas.addEventListener("pointerdown", (event) => {
  cursor(event, (event2) => {
    state.position.x -= event2.deltaX;
    state.position.y -= event2.deltaY;
    render();
  });
});
canvas.addEventListener("dblclick", (event) => {
  state.elements.push(
    createGridElement({
      x: event.clientX,
      y: event.clientY
    })
  );
});
window.addEventListener(
  "wheel",
  (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05;
    const oldScale = state.scale;
    const newScale = Math.max(0.1, Math.min(10, oldScale * scaleFactor));
    const gridX = (mouseX - state.position.x) / oldScale;
    const gridY = (mouseY - state.position.y) / oldScale;
    state.scale = newScale;
    state.position.x = mouseX - gridX * newScale;
    state.position.y = mouseY - gridY * newScale;
    render();
  },
  { passive: true }
);
window.addEventListener("resize", render);
const vertex = glsl`#version 300 es
${attribute.vec2("a_vertex")}
${uniform.vec2("u_screenSize")}
${uniform.vec2("u_pos")}
${uniform.float("u_scale")}
out vec2 v_gridCoord;

// Direct mapping: (-1,-1) is bottom-left, (1,1) is top-right in clip space
// We want (0,0) to be top-left in pixel space
vec2 project(vec2 pos, vec2 size){
  return vec2(
    (pos.x + 1.0),
    (1.0 - pos.y)
  ) * size * 0.5;
}

void main() {
  vec2 pixelPos = project(a_vertex, u_screenSize);
  
  // Apply offset and scale to get grid coordinates
  v_gridCoord = (pixelPos - u_pos) / u_scale;
  
  gl_Position = vec4(a_vertex, 0, 1);
}`;
const renderFragment = glsl`#version 300 es
precision highp float;
in vec2 v_gridCoord;
out vec4 fragColor;
${uniform.float("u_thickness")}

float grid(vec2 coord, float thickness) {
  vec2 cell = mod(coord, 100.0);
  vec2 derivative = fwidth(coord);
  
  // Convert thickness from screen pixels to grid space
  vec2 screenThickness = derivative * thickness;
  
  // Ensure minimum thickness to prevent lines from disappearing
  vec2 minThickness = max(screenThickness, derivative * 0.5);
  
  // Create hard edges by checking if we're within thickness of a grid line
  float lineX = step(cell.x, minThickness.x) + step(100.0 - minThickness.x, cell.x);
  float lineY = step(cell.y, minThickness.y) + step(100.0 - minThickness.y, cell.y);
  
  // Clamp to 0-1 range and return maximum (union of lines)
  return max(min(lineX, 1.0), min(lineY, 1.0));
}

void main() {
  // Create grid pattern with adjustable thickness
  float gridPattern = grid(v_gridCoord, u_thickness);
  
  // Grid colors
  vec3 backgroundColor = vec3(0.1, 0.1, 0.15);
  vec3 gridColor = vec3(0.3, 0.3, 0.4);
  vec3 color = mix(backgroundColor, gridColor, gridPattern);
  
  fragColor = vec4(color, 1.0);
}`;
const { program, schema } = compile(gl, vertex, renderFragment);
const { attributes, uniforms } = view(gl, program, schema);
attributes.a_vertex.set(new Float32Array([
  -1,
  -1,
  // bottom-left
  1,
  -1,
  // bottom-right
  -1,
  1,
  // top-left
  -1,
  1,
  // top-left
  1,
  -1,
  // bottom-right
  1,
  1
  // top-right
]));
function render() {
  gl.useProgram(program);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  attributes.a_vertex.bind();
  uniforms.u_screenSize.set(canvas.width, canvas.height);
  uniforms.u_pos.set(state.position.x, state.position.y);
  uniforms.u_scale.set(state.scale);
  uniforms.u_thickness.set(1);
  state.elements.forEach((element) => element.update());
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
render();
