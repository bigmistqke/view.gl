import { b as createFramebuffer, a as attribute, g as glsl, u as uniform, c as compile } from './tag-D1ni5Zei.js';
import { c as createElement } from './utils-CvCgsM08.js';

const MATERIALS = {
  SAND: {
    color: [1, 0.8, 0],
    // Yellow sand
    id: 1
  },
  WATER: {
    color: [0, 0.5, 1],
    // Blue water
    id: 2
  },
  STONE: {
    color: [0.5, 0.5, 0.5],
    // Gray stone
    id: 3
  }
};
const MATERIAL_SIZE = Object.keys(MATERIALS).length;
let playing = false;
let currentMaterial = MATERIALS.SAND.id;
const container = createElement("div", {
  style: "display: flex; flex-direction: column; align-items: center; gap: 10px;",
  parentElement: document.body
});
const buttonContainer = createElement("div", {
  style: "display: flex; gap: 10px; margin-bottom: 10px;",
  parentElement: container
});
Object.entries(MATERIALS).forEach(([name, material]) => {
  createElement("button", {
    textContent: name.toLowerCase(),
    "data-name": name,
    "data-id": material.id.toString(),
    style: `padding: 5px 10px;
    font-size: 14px;
    font-family: arial;
    cursor: pointer;
    color: black;
    background: ${currentMaterial === material.id ? `rgb(${material.color.map((c) => Math.floor(c * 255)).join(",")})` : `rgba(${material.color.map((c) => Math.floor(c * 255)).join(",")}, 0.75)`};
    border-color: ${name === "SAND" ? "black" : "white"};
    border: 2px solid rgb(${material.color.map((c) => Math.floor(c * 255)).join(",")});
    border-radius: 2px;
  `,
    onclick() {
      currentMaterial = material.id;
      buttonContainer.querySelectorAll("button").forEach((btn) => {
        const name2 = btn.getAttribute("data-name");
        const id = btn.getAttribute("data-id");
        if (id === currentMaterial.toString()) {
          btn.style.background = `rgb(${MATERIALS[name2].color.map((c) => Math.floor(c * 255)).join(",")})`;
        } else {
          btn.style.background = `rgba(${MATERIALS[name2].color.map((c) => Math.floor(c * 255)).join(",")}, 0.75)`;
        }
      });
    },
    parentElement: buttonContainer
  });
});
function spray() {
  return Math.floor(Math.random() * 8) * (Math.random() < 0.5 ? 1 : -1);
}
const canvas = createElement("canvas", {
  parentElement: container,
  onmousedown() {
    const rect = canvas.getBoundingClientRect();
    const controller = new AbortController();
    window.addEventListener(
      "mousemove",
      (event) => {
        const x = Math.floor((event.clientX - rect.left + spray()) * (canvas.width / rect.width));
        const y = Math.floor(
          (rect.bottom - event.clientY + spray()) * (canvas.height / rect.height)
        );
        const dimensions = [8, 8];
        const data = new Uint8Array(
          function* () {
            for (let i = 0; i < dimensions[0] * dimensions[1]; i++) {
              yield (currentMaterial & 1) * 255;
              yield (currentMaterial >> 1 & 1) * 255;
              yield (currentMaterial >> 2 & 1) * 255;
              yield 255;
            }
          }()
        );
        gl.bindTexture(gl.TEXTURE_2D, read.texture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          Math.max(0, Math.min(WIDTH - dimensions[0], x)),
          Math.max(0, Math.min(HEIGHT - dimensions[1], y)),
          dimensions[0],
          dimensions[1],
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          data
        );
        gl.bindTexture(gl.TEXTURE_2D, write.texture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          Math.max(0, Math.min(WIDTH - dimensions[0], x)),
          Math.max(0, Math.min(HEIGHT - dimensions[1], y)),
          dimensions[0],
          dimensions[1],
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          data
        );
        render();
      },
      controller
    );
    window.addEventListener(
      "mouseup",
      () => {
        controller.abort();
      },
      controller
    );
  }
});
const gl = canvas.getContext("webgl2", { antialias: false });
if (!gl) {
  throw new Error("WebGL not supported");
}
canvas.width = 256 * 2;
canvas.height = 256 * 2;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const vertex = glsl`#version 300 es
${attribute.vec2("a_vertex")}
out vec2 v_uv;
void main() {
  v_uv = a_vertex * 0.5 + 0.5;
  gl_Position = vec4(a_vertex, 0, 1);
}`;
const stepFragment = glsl`#version 300 es
precision highp float;
in vec2 v_uv;
${uniform.sampler2D("u_texture")}
${uniform.vec2("u_texelSize")}
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
  
  // Check boundaries
  bool atBottom = v_uv.y - u_texelSize.y < 0.0;
  bool atLeft = v_uv.x - u_texelSize.x < 0.0;
  bool atRight = v_uv.x + u_texelSize.x > 1.0;
  bool atTop = v_uv.y + u_texelSize.y > 1.0;
  
  // Default: keep current state
  fragColor = current;

  int material = getMaterial(current);

  int below = getMaterial(texture(u_texture, v_uv + DIR_DOWN * u_texelSize));
  int above = getMaterial(texture(u_texture, v_uv + DIR_UP * u_texelSize));
  int aboveLeft = getMaterial(texture(u_texture, v_uv + (DIR_UP + DIR_LEFT) * u_texelSize));
  int aboveRight = getMaterial(texture(u_texture, v_uv + (DIR_UP + DIR_RIGHT) * u_texelSize));
  int belowLeft = getMaterial(texture(u_texture, v_uv + (DIR_DOWN + DIR_LEFT) * u_texelSize));
  int belowRight = getMaterial(texture(u_texture, v_uv + (DIR_DOWN + DIR_RIGHT) * u_texelSize));
  
  // Physics simulation using switch
  switch (material) {
    case MAT_EMPTY:{
      // Empty cell - check what can fall/flow into it
      
      // Check for sand from above (highest priority - sand is denser)
      bool sandDirectlyAbove = !atTop && above == MAT_SAND;
      if (sandDirectlyAbove) {
        fragColor = encodeMaterial(MAT_SAND);
        break;
      }
      
      // Check for sand sliding from diagonal
      bool sandAboveLeft = !atTop && !atRight && aboveLeft == MAT_SAND;
      bool sandAboveRight = !atTop && !atLeft && aboveRight == MAT_SAND;
      
      if (sandAboveLeft) {
        vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
        bool leftBlocked = getMaterial(left) != MAT_EMPTY;
        bool canSlideFromLeft = leftBlocked || atBottom;
        if (canSlideFromLeft) {
          fragColor = encodeMaterial(MAT_SAND);
          break;
        }
      }
      
      if (sandAboveRight) {
        vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
        bool rightBlocked = getMaterial(right) != MAT_EMPTY;
        bool canSlideFromRight = rightBlocked || atBottom;
        if (canSlideFromRight) {
          fragColor = encodeMaterial(MAT_SAND);
          break;
        }
      }
      
      // Check for water from above
      bool waterDirectlyAbove = !atTop && above == MAT_WATER;
      if (waterDirectlyAbove) {
        fragColor = encodeMaterial(MAT_WATER);
        break;
      }
      
      // Check for water sliding from diagonal
      bool waterAboveLeft = !atTop && !atRight && aboveLeft == MAT_WATER;
      bool waterAboveRight = !atTop && !atLeft && aboveRight == MAT_WATER;
      
      if (waterAboveLeft) {
        vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
        bool sandToLeft = getMaterial(left) == MAT_SAND;
        if (!sandToLeft) {
          fragColor = encodeMaterial(MAT_WATER);
          break;
        }
      }
      
      if (waterAboveRight) {
        vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
        bool sandToRight = getMaterial(right) == MAT_SAND;
        if (!sandToRight) {
          fragColor = encodeMaterial(MAT_WATER);
          break;
        }
      }
      
      // Check for water flowing horizontally
      vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
      vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
      int matLeft = getMaterial(left);
      int matRight = getMaterial(right);
      
      bool waterToLeft = !atRight && matLeft == MAT_WATER;
      bool waterToRight = !atLeft && matRight == MAT_WATER;
      
      if (!waterToLeft && !waterToRight) break;
      
      // Random choice for symmetric flow
      float rand = fract(sin(dot(v_uv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453);
      bool preferLeft = rand < 0.5;
      
      if (
        waterToLeft && waterToRight ||
        waterToLeft ||
        waterToRight
      ) {
        fragColor = encodeMaterial(MAT_WATER);
        break;
      } 
    }
      
    case MAT_SAND: {
      // Sand particle - check if it should fall
      bool canFallThrough = below == MAT_EMPTY || below == MAT_WATER;
      bool canFallDown = !atBottom && canFallThrough;
      
      if (canFallDown) {
        fragColor = encodeMaterial(MAT_EMPTY);
        break;
      }
      
      // Check diagonal falling
      bool canFallThroughLeft = belowLeft == MAT_EMPTY || belowLeft == MAT_WATER;
      bool canFallThroughRight = belowRight == MAT_EMPTY || belowRight == MAT_WATER;
      
      bool canFallDownLeft = !atBottom && !atLeft && canFallThroughLeft;
      bool canFallDownRight = !atBottom && !atRight && canFallThroughRight;
      
      if (canFallDownLeft || canFallDownRight) {
        fragColor = encodeMaterial(MAT_EMPTY);
        break;
      }
      
      // Sand stays in place
      break;
    }
      
    case MAT_WATER: {
      // Water - check if being displaced by sand first
      bool sandFallingFromAbove = !atTop && above == MAT_SAND;
      if (sandFallingFromAbove) {
        fragColor = encodeMaterial(MAT_SAND);
        break;
      }
      
      // Check sand sliding into water from diagonals
      bool sandFromAboveLeft = !atTop && !atRight && aboveLeft == MAT_SAND;
      bool sandFromAboveRight = !atTop && !atLeft && aboveRight == MAT_SAND;
      
      if (sandFromAboveLeft) {
        vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
        bool leftNotEmpty = getMaterial(left) != MAT_EMPTY;
        bool sandCanSlideIn = leftNotEmpty || atBottom;

        if (sandCanSlideIn) {
          fragColor = encodeMaterial(MAT_SAND);
          break;
        }
      }
      
      if (sandFromAboveRight) {
        vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
        bool rightNotEmpty = getMaterial(right) != MAT_EMPTY;
        bool sandCanSlideIn = rightNotEmpty || atBottom;
        
        if (sandCanSlideIn) {
          fragColor = encodeMaterial(MAT_SAND);
          break;
        }
      }
      
      // Normal water physics - falling
      bool canFallDown = !atBottom && below == MAT_EMPTY;
      bool canFlowDownLeft = !atBottom && !atLeft && belowLeft == MAT_EMPTY;
      bool canFlowDownRight = !atBottom && !atRight && belowRight == MAT_EMPTY;

      if (canFallDown || canFlowDownLeft || canFlowDownRight) {
        fragColor = encodeMaterial(MAT_EMPTY);
        break;
      }
      
      // Horizontal spreading
      vec4 left = texture(u_texture, v_uv + DIR_LEFT * u_texelSize);
      vec4 right = texture(u_texture, v_uv + DIR_RIGHT * u_texelSize);
      int matLeft = getMaterial(left);
      int matRight = getMaterial(right);
      
      bool canFlowLeft = !atLeft && matLeft == MAT_EMPTY;
      bool canFlowRight = !atRight && matRight == MAT_EMPTY;
      
      if (!canFlowLeft && !canFlowRight) {
        break;
      }
      
      // Random horizontal movement for fluid behavior
      float rand = fract(sin(dot(v_uv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453);
      bool preferLeft = rand < 0.5;
      
      if (
        canFlowLeft && preferLeft || 
        canFlowRight && !preferLeft ||
        canFlowLeft || 
        canFlowDownRight
      ) {
        fragColor = encodeMaterial(MAT_EMPTY);
        break;
      }
    
    }
      
    case MAT_STONE:
      // Stone doesn't move
      break;
      
    default:
      // Unknown material - keep as is
      break;
  }
}`;
const renderFragment = glsl`#version 300 es
precision mediump float;
in vec2 v_uv;
${uniform.sampler2D("u_texture")}
${uniform.vec3("u_palette", { size: MATERIAL_SIZE })}
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
}`;
const { program: stepProgram, view: stepView } = compile(gl, vertex, stepFragment);
const { program: renderProgram, view: renderView } = compile(gl, vertex, renderFragment, {
  attributes: { a_vertex: { buffer: stepView.attributes.a_vertex.buffer } }
});
gl.useProgram(renderProgram);
renderView.uniforms.u_palette.set(
  new Float32Array(Object.values(MATERIALS).flatMap(({ color }) => color))
);
gl.useProgram(stepProgram);
stepView.attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
const framebufferOptions = {
  attachment: "color",
  width: WIDTH,
  height: HEIGHT,
  type: "UNSIGNED_BYTE",
  magFilter: "NEAREST",
  minFilter: "NEAREST",
  internalFormat: "RGBA",
  format: "RGBA"
};
let read = createFramebuffer(gl, framebufferOptions);
let write = createFramebuffer(gl, framebufferOptions);
const initData = new Uint8Array(
  function* () {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      yield 0;
      yield 0;
      yield 0;
      yield 255;
    }
  }()
);
gl.bindTexture(gl.TEXTURE_2D, read.texture);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, initData);
gl.bindTexture(gl.TEXTURE_2D, write.texture);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, initData);
function step() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
  gl.viewport(0, 0, WIDTH, HEIGHT);
  gl.useProgram(stepProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, read.texture);
  stepView.uniforms.u_texture.set(0);
  stepView.uniforms.u_texelSize.set(1 / WIDTH, 1 / HEIGHT);
  stepView.attributes.a_vertex.bind();
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
function render() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.useProgram(renderProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, write.texture);
  renderView.uniforms.u_texture.set(0);
  renderView.attributes.a_vertex.bind();
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
function animate() {
  if (playing) {
    step();
    render();
    [read, write] = [write, read];
    requestAnimationFrame(animate);
  }
}
playing = true;
animate();

export { MATERIALS };
