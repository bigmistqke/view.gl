import { a as attribute, u as uniform, g as glsl, c as compile, d as uniformView, e as attributeView } from './tag-B8cKWkxB.js';

function rotate(data, size, clockwise = true) {
  for (let layer = 0; layer < Math.floor(size / 2); layer++) {
    const first = layer;
    const last = size - 1 - layer;
    for (let i = 0; i < last - first; i++) {
      const top = getColorIndex(data, first, first + i, size);
      const right = getColorIndex(data, first + i, last, size);
      const bottom = getColorIndex(data, last, last - i, size);
      const left = getColorIndex(data, last - i, first, size);
      if (clockwise) {
        setColorIndex(data, first + i, last, size, top);
        setColorIndex(data, last, last - i, size, right);
        setColorIndex(data, last - i, first, size, bottom);
        setColorIndex(data, first, first + i, size, left);
      } else {
        setColorIndex(data, last - i, first, size, top);
        setColorIndex(data, last, last - i, size, left);
        setColorIndex(data, first + i, last, size, bottom);
        setColorIndex(data, first, first + i, size, right);
      }
    }
  }
  function getColorIndex(buf, x, y, size2) {
    return buf[y * size2 + x];
  }
  function setColorIndex(buf, x, y, size2, pixel) {
    buf[y * size2 + x] = pixel;
  }
}
function createTimeout() {
  let timeout;
  return {
    set(callback, time) {
      clearTimeout(timeout);
      timeout = setTimeout(callback, time);
    },
    clear() {
      clearTimeout(timeout);
    }
  };
}
const WIDTH = 10;
const HEIGHT = 20;
const TETROMINO = {
  I: {
    dimensions: [4, 4],
    pixels: () => new Float32Array([0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
    color: [0, 1, 1]
    // Cyan
  },
  O: {
    dimensions: [2, 2],
    pixels: () => new Float32Array([2, 2, 2, 2]),
    color: [1, 1, 0]
    // Yellow
  },
  T: {
    dimensions: [3, 3],
    pixels: () => new Float32Array([0, 3, 0, 3, 3, 3, 0, 0, 0]),
    color: [0.6, 0, 1]
    // Purple
  },
  S: {
    dimensions: [3, 3],
    pixels: () => new Float32Array([0, 4, 4, 4, 4, 0, 0, 0, 0]),
    color: [0, 1, 0]
  },
  Z: {
    dimensions: [3, 3],
    pixels: () => new Float32Array([5, 5, 0, 0, 5, 5, 0, 0, 0]),
    color: [1, 0, 0]
  },
  J: {
    dimensions: [3, 3],
    pixels: () => new Float32Array([6, 0, 0, 6, 6, 6, 0, 0, 0]),
    color: [0, 0, 1]
  },
  L: {
    dimensions: [3, 3],
    pixels: () => new Float32Array([0, 0, 7, 7, 7, 7, 0, 0, 0]),
    color: [1, 0.5, 0]
  }
};
const TETROMINO_KIND = Object.keys(TETROMINO);
function getRandomTetrominoKind() {
  return TETROMINO_KIND[Math.floor(Math.random() * TETROMINO_KIND.length)];
}
function createTetromino(gl, program, schema) {
  const { a_index, a_pixel } = attributeView(gl, program, schema);
  let pixels = null;
  let dimensions = null;
  let offset = null;
  let pixelCount = null;
  function next(kind = getRandomTetrominoKind()) {
    const template = TETROMINO[kind];
    pixels = template.pixels();
    pixelCount = template.dimensions[0] * template.dimensions[1];
    offset = [Math.ceil((WIDTH - template.dimensions[0]) / 2), HEIGHT - template.dimensions[1]];
    dimensions = template.dimensions;
    a_index.set(new Float32Array(Array.from({ length: pixelCount }, (_, index) => index)));
    a_pixel.set(pixels);
  }
  next();
  return {
    get dimensions() {
      return dimensions;
    },
    get pixels() {
      return pixels;
    },
    get offset() {
      return offset;
    },
    get pixelCount() {
      return pixelCount;
    },
    bindAttributes() {
      a_index.bind();
      a_pixel.bind();
    },
    next,
    rotate(clockwise = true) {
      rotate(pixels, dimensions[1], clockwise);
      a_pixel.set(pixels).bind();
    }
  };
}
function createBoard(gl, program, schema) {
  const { a_index, a_pixel } = attributeView(gl, program, schema);
  const array = new Float32Array(Array.from({ length: WIDTH * HEIGHT }, () => 0));
  a_index.set(new Float32Array(Array.from({ length: WIDTH * HEIGHT }, (_, index) => index)));
  a_pixel.set(array);
  return {
    bindAttributes() {
      a_index.bind();
      a_pixel.bind();
    },
    array,
    blit({ pixelCount, offset, dimensions, pixels }) {
      for (let i = 0; i < pixelCount; i++) {
        const pixel = pixels[i];
        if (pixel) {
          const x = offset[0] + i % dimensions[0];
          const y = offset[1] + Math.floor(i / dimensions[0]) + 1;
          const index = x + y * WIDTH;
          array[index] = pixel;
        }
      }
      let writeRow = 0;
      for (let y = 0; y < HEIGHT; y++) {
        let isComplete = true;
        for (let x = 0; x < WIDTH; x++) {
          if (array[x + y * WIDTH] === 0) {
            isComplete = false;
            break;
          }
        }
        if (!isComplete) {
          if (writeRow !== y) {
            for (let x = 0; x < WIDTH; x++) {
              array[x + writeRow * WIDTH] = array[x + y * WIDTH];
            }
          }
          writeRow++;
        }
      }
      a_pixel.set(array);
    }
  };
}
const vertex = glsl`
precision mediump float;

${attribute.float("a_index", { instanced: true })}
${attribute.float("a_pixel", { instanced: true })}
${attribute.vec2("a_vertex")}
${uniform.vec2("u_offset")}
${uniform.vec2("u_dimensions")}
${uniform.vec3("u_palette", { size: 7 })}

varying vec3 v_color;

void main(){
  float columns = mod(a_index, u_dimensions.x);
  float rows = floor(a_index / u_dimensions.x);

  vec2 offset = (vec2(columns, rows) + u_offset);

  vec2 base = offset + 0.5;
  vec2 pos = (a_vertex + base) / vec2(10., 20.);

  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);

  if(a_pixel == 0.){
    v_color = vec3(0., 0., 0.);
  }else{
    v_color = u_palette[int(a_pixel) - 1];
  }
}`;
const fragment = glsl`
precision mediump float;

varying vec3 v_color;

void main() {
  if(v_color.x + v_color.y + v_color.z == 0.){
    discard;
  }
  gl_FragColor = vec4(v_color, 1.0);
}`;
function createTetris() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * 30;
  canvas.height = HEIGHT * 30;
  document.body.append(canvas);
  const animationTimeout = createTimeout();
  const gl = canvas.getContext("webgl2");
  gl.viewport(0, 0, canvas.width, canvas.height);
  const { program, schema } = compile(gl, vertex, fragment);
  gl.useProgram(program);
  const { u_dimensions, u_offset, u_palette } = uniformView(gl, program, schema.uniforms);
  const { a_vertex, ...localSchema } = schema.attributes;
  const globalAttributes = attributeView(gl, program, { a_vertex });
  const board = createBoard(gl, program, localSchema);
  const tetromino = createTetromino(gl, program, localSchema);
  u_palette.set(new Float32Array(Object.values(TETROMINO).flatMap(({ color }) => color)));
  globalAttributes.a_vertex.set(
    new Float32Array([
      // triangle 1
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      // triangle 2
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5
    ])
  ).bind();
  function checkCollision() {
    for (let i = 0; i < tetromino.pixelCount; i++) {
      const x = i % tetromino.dimensions[0] + tetromino.offset[0];
      const y = Math.floor(i / tetromino.dimensions[0]) + tetromino.offset[1];
      let pixel = tetromino.pixels[i];
      if (pixel > 0) {
        if (x < 0) return true;
        if (x >= WIDTH) return true;
        if (y < 0) return true;
        const boardPixel = board.array[x + y * WIDTH];
        if (boardPixel !== 0) {
          return true;
        }
      }
    }
  }
  function next() {
    board.blit(tetromino);
    tetromino.next();
    if (checkCollision()) {
      document.removeEventListener("keydown", handleKeyDown);
      animationTimeout.clear();
    } else {
      render();
      animationTimeout.set(animate, 1e3);
    }
  }
  function handleKeyDown(event) {
    switch (event.key) {
      case "ArrowUp":
        tetromino.rotate();
        if (checkCollision()) {
          tetromino.rotate(false);
        } else {
          render();
        }
        break;
      case "ArrowDown":
        tetromino.offset[1]--;
        if (checkCollision()) {
          next();
        } else {
          render();
        }
        break;
      case "ArrowLeft":
        tetromino.offset[0]--;
        if (checkCollision()) {
          tetromino.offset[0]++;
        } else {
          render();
        }
        break;
      case "ArrowRight":
        tetromino.offset[0]++;
        if (checkCollision()) {
          tetromino.offset[0]--;
        } else {
          render();
        }
        break;
      case " ":
        while (true) {
          tetromino.offset[1]--;
          if (checkCollision()) {
            next();
            break;
          }
        }
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  function render() {
    gl.clearColor(0, 0.5, 0, 0.3);
    gl.clear(gl.COLOR_BUFFER_BIT);
    u_offset.set(0, 0);
    u_dimensions.set(WIDTH, HEIGHT);
    board.bindAttributes();
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, WIDTH * HEIGHT);
    u_offset.set(...tetromino.offset);
    u_dimensions.set(...tetromino.dimensions);
    tetromino.bindAttributes();
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, tetromino.pixelCount);
  }
  function animate() {
    tetromino.offset[1]--;
    if (checkCollision()) {
      next();
    }
    render();
    animationTimeout.set(animate, 1e3);
  }
  setTimeout(animate, 1e3);
  render();
}
createTetris();

export { TETROMINO };
