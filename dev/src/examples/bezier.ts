import { attribute, compile, glsl, interleave, uniform } from 'view.gl/tag'
import { cursor, dom } from '../utils'

// Create canvas and WebGL context
const canvas = dom('canvas', { parentElement: document.body })
canvas.width = window.innerWidth
canvas.height = window.innerHeight
const gl = canvas.getContext('webgl2', { antialias: true })!

if (!gl) {
  throw new Error('WebGL not supported')
}

// Application state containing control points and view transformation
const state = {
  position: { x: 0, y: 0 }, // Pan offset in screen pixels
  scale: 1, // Zoom level
  controlPoints: [
    { x: 200, y: 400 }, // P0: Start point of the bezier curve
    { x: 400, y: 100 }, // P1: Control point (influences curvature)
    { x: 600, y: 400 }, // P2: End point of the bezier curve
  ] as const,
  dragIndex: -1, // Index of control point being dragged (-1 = none)
}

/**********************************************************************************/
/*                                                                                */
/*                                      Utils                                     */
/*                                                                                */
/**********************************************************************************/

// Convert screen coordinates (pixels) to world coordinates
// This allows us to work in a consistent coordinate system regardless of zoom/pan
function screenToWorld(screenX: number, screenY: number) {
  return {
    x: (screenX - state.position.x) / state.scale,
    y: (screenY - state.position.y) / state.scale,
  }
}

// Convert world coordinates back to screen coordinates for rendering
function worldToScreen(worldX: number, worldY: number) {
  return {
    x: worldX * state.scale + state.position.x,
    y: worldY * state.scale + state.position.y,
  }
}

// Check if a click/touch is near a control point
// Used for interactive dragging of control points
function getControlPointAt(x: number, y: number, threshold = 20) {
  for (let i = 0; i < state.controlPoints.length; i++) {
    const screen = worldToScreen(state.controlPoints[i]!.x, state.controlPoints[i]!.y)
    const dx = x - screen.x
    const dy = y - screen.y
    // Use distance squared to avoid expensive sqrt calculation
    if (dx * dx + dy * dy < threshold * threshold) {
      return i
    }
  }
  return -1
}

/**********************************************************************************/
/*                                                                                */
/*                                  Event Handlers                                */
/*                                                                                */
/**********************************************************************************/

// Handle mouse/touch interaction for dragging control points or panning the view
canvas.addEventListener('pointerdown', event => {
  const hitIndex = getControlPointAt(event.clientX, event.clientY)

  if (hitIndex >= 0) {
    // User clicked on a control point - enable dragging
    state.dragIndex = hitIndex
    cursor(event, event => {
      const world = screenToWorld(event.clientX, event.clientY)
      state.controlPoints[state.dragIndex] = world
      render()
    })
  } else {
    // User clicked on empty space - enable panning
    cursor(event, event => {
      state.position.x -= event.deltaX
      state.position.y -= event.deltaY
      render()
    })
  }
})

// Handle mouse wheel for zooming (with zoom-to-cursor behavior)
canvas.addEventListener(
  'wheel',
  event => {
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05
    const oldScale = state.scale
    const newScale = Math.max(0.1, Math.min(10, oldScale * scaleFactor))

    // Calculate the world coordinate under the mouse cursor before scaling
    const worldX = (mouseX - state.position.x) / oldScale
    const worldY = (mouseY - state.position.y) / oldScale

    // Update scale
    state.scale = newScale

    // Adjust pan offset to keep the same world point under the cursor
    // This creates the "zoom to cursor" effect
    state.position.x = mouseX - worldX * newScale
    state.position.y = mouseY - worldY * newScale

    render()
  },
  { passive: true },
)

// Handle window resizing
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  render()
})

/**********************************************************************************/
/*                                                                                */
/*                                     Shaders                                    */
/*                                                                                */
/**********************************************************************************/

// Vertex shader for the bezier curve
// This shader evaluates the bezier curve on the GPU and creates the triangle strip
const curveVertex = glsl`#version 300 es
// Attributes (per-vertex data)
${interleave('data', [
  attribute.float('a_t'),
  attribute.float('a_side'),
])}     // Bezier parameter t ∈ [0,1]

// Uniforms (shared data for all vertices)
${uniform.vec2('u_resolution')}   // Canvas size in pixels
${uniform.vec2('u_offset')}       // Pan offset in pixels
${uniform.float('u_scale')}       // Zoom level
${uniform.vec2('u_p0')}          // Control point P0 (start)
${uniform.vec2('u_p1')}          // Control point P1 (control)
${uniform.vec2('u_p2')}          // Control point P2 (end)
${uniform.float('u_thickness')}   // Curve thickness in world units

void main() {
  // STEP 1: Evaluate the quadratic bezier curve at parameter t
  // Quadratic bezier formula: B(t) = (1-t)²P0 + 2t(1-t)P1 + t²P2
  float t = a_t;
  float s = 1.0 - t;  // s is often used for (1-t) for brevity
  
  // Calculate the position on the curve
  vec2 position = s * s * u_p0 +         // (1-t)² * P0
                  2.0 * s * t * u_p1 +   // 2(1-t)t * P1
                  t * t * u_p2;          // t² * P2
  
  // STEP 2: Calculate the tangent vector at this point
  // The derivative of the bezier curve gives us the tangent
  // B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  vec2 tangent = 2.0 * s * (u_p1 - u_p0) + 2.0 * t * (u_p2 - u_p1);
  
  // STEP 3: Create a normal vector (perpendicular to tangent)
  // Rotate tangent 90 degrees: (x,y) → (-y,x)
  vec2 normal = normalize(vec2(-tangent.y, tangent.x));
  
  // STEP 4: Offset the curve position to create thickness
  // Move the vertex perpendicular to the curve by thickness * side
  vec2 offsetPosition = position + normal * u_thickness * a_side;
  
  // STEP 5: Transform from world space to screen space
  vec2 screenPos = offsetPosition * u_scale + u_offset;
  
  // STEP 6: Convert to clip space (OpenGL's coordinate system)
  // Screen space: (0,0) is top-left, (width,height) is bottom-right
  // Clip space: (-1,-1) is bottom-left, (1,1) is top-right
  vec2 clipPos = (screenPos / u_resolution) * 2.0 - 1.0;
  clipPos.y = -clipPos.y;  // Flip Y to match screen coordinates
  
  gl_Position = vec4(clipPos, 0, 1);
}`

// Fragment shader for the bezier curve
// Simple solid color for now - could be extended for gradients, textures, etc.
const curveFragment = glsl`#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
  // Output a solid blue color for the curve
  vec3 curveColor = vec3(0.2, 0.6, 1.0);
  fragColor = vec4(curveColor, 1.0);
}`

// Vertex shader for control points (rendered as small squares)
const pointVertex = glsl`#version 300 es
${attribute.vec2('a_vertex')}      // Quad vertex position (-1 to 1)
${uniform.vec2('u_resolution')}     // Canvas size
${uniform.vec2('u_offset')}         // Pan offset
${uniform.float('u_scale')}         // Zoom level
${uniform.vec2('u_pointPos')}       // Control point position in world space

void main() {
  // Create a small square around the control point position
  vec2 screenPos = (u_pointPos * u_scale + u_offset) + a_vertex * 8.0;
  
  // Transform to clip space
  vec2 clipPos = (screenPos / u_resolution) * 2.0 - 1.0;
  clipPos.y = -clipPos.y;
  gl_Position = vec4(clipPos, 0, 1);
}`

// Fragment shader for control points
const pointFragment = glsl`#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
  // Red color for control points
  fragColor = vec4(1.0, 0.3, 0.3, 1.0);
}`

// Vertex shader for control polygon lines
// The control polygon connects P0→P1→P2 and helps visualize the curve construction
const lineVertex = glsl`#version 300 es
${attribute.vec2('a_position')}     // Line vertex position
${uniform.vec2('u_resolution')}      // Canvas size
${uniform.vec2('u_offset')}          // Pan offset
${uniform.float('u_scale')}          // Zoom level

void main() {
  // Transform world position to screen space then clip space
  vec2 screenPos = a_position * u_scale + u_offset;
  vec2 clipPos = (screenPos / u_resolution) * 2.0 - 1.0;
  clipPos.y = -clipPos.y;
  gl_Position = vec4(clipPos, 0, 1);
}`

// Fragment shader for control polygon lines
const lineFragment = glsl`#version 300 es
precision mediump float;
out vec4 fragColor;

void main() {
  // Semi-transparent gray for control polygon
  fragColor = vec4(0.5, 0.5, 0.5, 0.5);
}`

/**********************************************************************************/
/*                                                                                */
/*                                  Create Programs                                */
/*                                                                                */
/**********************************************************************************/

// Compile shaders and create shader programs
const { program: curveProgram, view: curveView } = compile(gl, curveVertex, curveFragment)
const { program: pointProgram, view: pointView } = compile(gl, pointVertex, pointFragment)
const { program: lineProgram, view: lineView } = compile(gl, lineVertex, lineFragment)

/**********************************************************************************/
/*                                                                                */
/*                              Triangle Strip Generation                         */
/*                                                                                */
/**********************************************************************************/

// Number of segments to divide the curve into
// More segments = smoother curve but more vertices
const curveSegments = 100

// Generate the vertex data for the triangle strip
// We create pairs of vertices along the curve that will form the strip
function generateTriangleStrip() {
  // The triangle strip will connect these vertices like this:
  // t=0:     [L0]-[R0]
  //           |  / |
  // t=0.1:   [L1]-[R1]
  //           |  \ |
  // t=0.2:   [L2]-[R2]
  // etc...

  return new Float32Array(
    (function* () {
      for (let i = 0; i <= curveSegments; i++) {
        const t = i / curveSegments
        yield t
        yield -1
        yield t
        yield 1
      }
    })(),
  )
  /* 
  return {
    t: new Float32Array(
      (function* () {
        for (let i = 0; i <= curveSegments; i++) {
          const t = i / curveSegments
          yield t
          yield t
        }
      })(),
    ),
    side: new Float32Array(
      (function* () {
        for (let i = 0; i <= curveSegments; i++) {
          yield -1
          yield 1
        }
      })(),
    ),
  } */
}

// Generate and upload triangle strip data to GPU
const stripData = generateTriangleStrip()
curveView.interleavedAttributes.data.set(stripData)
// curveView.attributes.a_side.set(stripData.side)

// prettier-ignore
// Create geometry for control points (a simple quad)
const pointVertices = new Float32Array([
  -1, -1, // Bottom-left
   1, -1, // Bottom-right
  -1,  1, // Top-left
  -1,  1, // Top-left (repeated for second triangle)
   1, -1, // Bottom-right (repeated for second triangle)
   1,  1, // Top-right
])
pointView.attributes.a_vertex.set(pointVertices)

// Update control polygon line data when control points change
function updateLineData() {
  const lineVerticesData = new Float32Array([
    state.controlPoints[0].x,
    state.controlPoints[0].y, // P0
    state.controlPoints[1].x,
    state.controlPoints[1].y, // P1
    state.controlPoints[1].x,
    state.controlPoints[1].y, // P1 (repeated)
    state.controlPoints[2].x,
    state.controlPoints[2].y, // P2
  ])
  lineView.attributes.a_position.set(lineVerticesData)
}

updateLineData()

/**********************************************************************************/
/*                                                                                */
/*                                  Render Function                               */
/*                                                                                */
/**********************************************************************************/

function render() {
  console.log('render!')
  // Update canvas size if window was resized
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  // Set up WebGL viewport and clear the canvas
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0.1, 0.1, 0.15, 1) // Dark background
  gl.clear(gl.COLOR_BUFFER_BIT)

  // Enable alpha blending for transparency
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  // Update line data when control points change
  updateLineData()

  // STEP 1: Render control polygon lines
  gl.useProgram(lineProgram)
  lineView.attributes.a_position.bind()

  lineView.uniforms.u_resolution.set(canvas.width, canvas.height)
  lineView.uniforms.u_offset.set(state.position.x, state.position.y)
  lineView.uniforms.u_scale.set(state.scale)

  gl.drawArrays(gl.LINES, 0, 4) // 2 lines × 2 vertices = 4 vertices

  // STEP 2: Render bezier curve as triangle strip
  gl.useProgram(curveProgram)
  curveView.interleavedAttributes.data.bind()

  // Set uniforms for curve rendering
  curveView.uniforms.u_resolution.set(canvas.width, canvas.height)
  curveView.uniforms.u_offset.set(state.position.x, state.position.y)
  curveView.uniforms.u_scale.set(state.scale)
  curveView.uniforms.u_p0.set(state.controlPoints[0].x, state.controlPoints[0].y)
  curveView.uniforms.u_p1.set(state.controlPoints[1].x, state.controlPoints[1].y)
  curveView.uniforms.u_p2.set(state.controlPoints[2].x, state.controlPoints[2].y)
  curveView.uniforms.u_thickness.set(5.0) // Curve thickness in world units

  // Draw the triangle strip
  // Total vertices = (segments + 1) × 2 (left and right side for each t)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, (curveSegments + 1) * 2)
  curveView.interleavedAttributes.data.unbind()

  // STEP 3: Render control points on top
  gl.useProgram(pointProgram)
  pointView.attributes.a_vertex.bind()

  pointView.uniforms.u_resolution.set(canvas.width, canvas.height)
  pointView.uniforms.u_offset.set(state.position.x, state.position.y)
  pointView.uniforms.u_scale.set(state.scale)

  // Draw each control point
  for (const point of state.controlPoints) {
    pointView.uniforms.u_pointPos.set(point.x, point.y)
    gl.drawArrays(gl.TRIANGLES, 0, 6) // 2 triangles × 3 vertices = 6 vertices
  }
}

// Initial render
render()
