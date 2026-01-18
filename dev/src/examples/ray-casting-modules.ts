import { compile, glsl, uniform } from '../../../src/tag.ts'
import { GLSL, GLSLToView } from '../../../src/types.ts'
import { dom } from '../utils.ts'

const NUM_SPHERES = 8
const NUM_BOXES = 3
const NUM_TORI = 4

// Ray casting quality control
const RAY_MARCH_ITERATIONS = 129 // Higher = better quality but slower (default: 128)
const RAY_HIT_THRESHOLD = 0.001 // Lower = better quality but slower (default: 0.001)
const NORMAL_EPSILON = 0.001 // Lower = more accurate normals (default: 0.001)

// Create typed arrays for sphere data and colors
const SPHERE_FLOAT_ARRAYS = {
  positions: new Float32Array(
    [
      [0, 0, 0, 1.2],
      [1.5, 0.5, -1, 1.0],
      [-1.5, -0.5, 0.5, 1.0],
      [0.5, 1.5, -0.5, 0.9],
      [-1, -1.5, 1, 0.8],
      [2, -1, -1.5, 0.7],
      [-2, 1, 1.5, 0.9],
      [0, -0.5, -2, 1.0],
    ].flat(),
  ),
  colors: new Float32Array(
    [
      [1.0, 0.3, 0.3], // Red
      [0.3, 1.0, 0.3], // Green
      [0.3, 0.3, 1.0], // Blue
      [1.0, 1.0, 0.3], // Yellow
      [1.0, 0.3, 1.0], // Magenta
      [0.3, 1.0, 1.0], // Cyan
      [1.0, 0.7, 0.3], // Orange
      [0.7, 0.3, 1.0], // Purple
    ].flat(),
  ),
}

// Create typed arrays for box data and colors
const BOX_FLOAT_ARRAYS = {
  positions: new Float32Array(
    [
      [1, 0, -0.5, 0.9],
      [-1, 0, 0.5, 0.8],
      [0, -1, -1, 0.9],
    ].flat(),
  ),
  colors: new Float32Array(
    [
      [0.8, 0.8, 0.2], // Yellow-green
      [0.2, 0.8, 0.8], // Cyan
      [0.8, 0.2, 0.8], // Magenta
    ].flat(),
  ),
}

// Create typed arrays for torus data and colors
const TORUS_FLOAT_ARRAYS = {
  positions: new Float32Array(
    [
      [0, 1.5, 0],
      [-1.5, 0, 0],
      [1.5, -0.5, -0.5],
      [0, -1.5, 1],
    ].flat(),
  ),
  radii: new Float32Array(
    [
      [0.8, 0.3],
      [0.6, 0.2],
      [0.7, 0.25],
      [0.5, 0.2],
    ].flat(),
  ),
  colors: new Float32Array(
    [
      [0.9, 0.5, 0.2], // Orange
      [0.2, 0.9, 0.5], // Green
      [0.5, 0.2, 0.9], // Purple
      [0.9, 0.9, 0.2], // Yellow
    ].flat(),
  ),
}

let SHAPE_COUNTER = 0

class Camera {
  private theta = 0 // Horizontal angle
  private phi = Math.PI / 4 // Vertical angle
  private targetTheta = 0
  private targetPhi = Math.PI / 4
  radius = 6

  private isDragging = false
  private lastX = 0
  private lastY = 0

  private position = [0, 0, 0] as [number, number, number]
  private direction = [0, 0, -1] as [number, number, number]
  private up = [0, 1, 0] as [number, number, number]
  private right = [1, 0, 0] as [number, number, number]

  template = glsl`
${uniform.vec3('u_cameraPos')}
${uniform.vec3('u_cameraDir')}
${uniform.vec3('u_cameraUp')}
${uniform.vec3('u_cameraRight')}`

  view?: GLSLToView<typeof this.template>

  startDrag(x: number, y: number) {
    this.isDragging = true
    this.lastX = x
    this.lastY = y
  }

  drag(x: number, y: number) {
    if (!this.isDragging) return

    const deltaX = x - this.lastX
    const deltaY = y - this.lastY

    this.targetTheta += deltaX * 0.01
    this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi - deltaY * 0.01))

    this.lastX = x
    this.lastY = y
  }

  endDrag() {
    this.isDragging = false
  }

  zoom(delta: number) {
    this.radius = Math.max(2, Math.min(15, this.radius + delta * 0.01))
  }

  update() {
    // Smooth camera rotation
    this.theta += (this.targetTheta - this.theta) * 0.1
    this.phi += (this.targetPhi - this.phi) * 0.1

    // Calculate camera position from spherical coordinates
    const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta)
    const y = this.radius * Math.cos(this.phi)
    const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta)

    this.position = [x, y, z]
    const target = [0, 0, 0] as const

    // Calculate camera direction (looking at origin)
    const dir = [
      target[0] - this.position[0],
      target[1] - this.position[1],
      target[2] - this.position[2],
    ] as const
    const dirLength = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2)
    this.direction = [dir[0] / dirLength, dir[1] / dirLength, dir[2] / dirLength]

    // Calculate up vector
    const up = [0, 1, 0] as const

    // Calculate right vector (cross product of dir and up)
    this.right = [
      this.direction[1] * up[2] - this.direction[2] * up[1],
      this.direction[2] * up[0] - this.direction[0] * up[2],
      this.direction[0] * up[1] - this.direction[1] * up[0],
    ] as const

    // Recalculate up vector (cross product of right and dir)
    this.up = [
      this.right[1] * this.direction[2] - this.right[2] * this.direction[1],
      this.right[2] * this.direction[0] - this.right[0] * this.direction[2],
      this.right[0] * this.direction[1] - this.right[1] * this.direction[0],
    ] as const

    // Update uniforms
    if (this.view) {
      this.view.uniforms.u_cameraPos.set(this.position[0], this.position[1], this.position[2])
      this.view.uniforms.u_cameraDir.set(this.direction[0], this.direction[1], this.direction[2])
      this.view.uniforms.u_cameraUp.set(this.up[0], this.up[1], this.up[2])
      this.view.uniforms.u_cameraRight.set(this.right[0], this.right[1], this.right[2])
    }
  }
}

const controller = new AbortController()
const canvas = dom('canvas', { parentElement: document.body })

const gl = canvas.getContext('webgl2')!

// Blending parameter
let blendFactor = 0.8

abstract class Shape {
  id = SHAPE_COUNTER++
  abstract template: GLSL
  view?: GLSLToView<typeof this.template>

  calculateIntersection = Symbol()
  calculateColor = Symbol()
  calculateSDF = Symbol()
  u_data = Symbol()
  u_colors = Symbol()
  u_positions = Symbol()
  u_radii = Symbol()

  setData(data: Float32Array) {
    this.view?.uniforms[this.u_data]?.set(data)
    return this
  }
  setColors(data: Float32Array) {
    this.view?.uniforms[this.u_colors]?.set(data)
    return this
  }
}

class Sphere extends Shape {
  sphereIntersection = Symbol()
  sphereNormal = Symbol()
  sphereSDF = Symbol()
  template = glsl`
struct Sphere {
	vec3 position;
	float radius;
	vec3 color;
};

${uniform.vec4(this.u_data, { size: NUM_SPHERES })}
${uniform.vec3(this.u_colors, { size: NUM_SPHERES })}

float ${this.sphereIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in Sphere sphere)
{
	// We're shooting a ray from the camera and checking if it hits a sphere
	// Think of it like shining a laser pointer at a ball
	
	vec3 rayToSphere = rayOrigin - sphere.position;
	
	// Step 1: Find the closest point on the ray to the sphere's position
	// This is like finding where the laser beam passes nearest to the ball's position
	float closestApproach = dot(rayToSphere, rayDirection);
	
	// Step 2: Check if we're already inside the sphere
	// If negative, we're outside and pointing away from sphere position
	float rayStartDistanceSquared = dot(rayToSphere, rayToSphere) - sphere.radius * sphere.radius;
	
	// Step 3: Use geometry to check if the ray can reach the sphere
	// If this value is negative, the ray misses the sphere entirely
	float canReachSphere = closestApproach * closestApproach - rayStartDistanceSquared;
	
	if(canReachSphere < 0.0) {
		return -1.0; // Ray misses the sphere
	}
	
	// Step 4: Calculate how far along the ray we hit the sphere
	// We want the nearest intersection point (there can be two when ray goes through)
	float hitDistance = -closestApproach - sqrt(canReachSphere);
	
	return hitDistance;
}

// Calculate normal vector at hit point on sphere surface
vec3 ${this.sphereNormal}(in vec3 hitPosition, in Sphere sphere)
{
	return (hitPosition - sphere.position) / sphere.radius;
}

// Find closest sphere intersection, returns distance and sets hitIndex and hitType
float ${this.calculateIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in float maxDistance, out int hitIndex, out int hitType)
{
	float closestDistance = maxDistance;
	hitIndex = -1;
	hitType = -1;
	
	for(int i = 0; i < ${NUM_SPHERES}; i++) {
		Sphere sphere = Sphere(${this.u_data}[i].xyz, ${this.u_data}[i].w, ${this.u_colors}[i]);
		float distance = ${this.sphereIntersection}(rayOrigin, rayDirection, sphere);
		
		if(distance > 0.0 && distance < closestDistance) {
			closestDistance = distance;
			hitIndex = i;
			hitType = ${this.id};
		}
	}
	
	return hitIndex >= 0 ? closestDistance : -1.0;
}

// Calculate sphere normal and color at hit point
void ${this.calculateColor}(in vec3 hitPosition, in int hitIndex, out vec3 normal, out vec3 color)
{
	Sphere hitSphere = Sphere(${this.u_data}[hitIndex].xyz, ${this.u_data}[hitIndex].w, ${this.u_colors}[hitIndex]);
	normal = ${this.sphereNormal}(hitPosition, hitSphere);
	color = ${this.u_colors}[hitIndex];
}

// Signed distance function for sphere
float ${this.sphereSDF}(in vec3 point, in vec3 center, in float radius)
{
	return length(point - center) - radius;
}

// Calculate SDF for all spheres
float ${this.calculateSDF}(in vec3 point, out int nearestIndex, out float minDistance)
{
	minDistance = 1000.0;
	nearestIndex = -1;
	
	for(int i = 0; i < ${NUM_SPHERES}; i++) {
		float distance = ${this.sphereSDF}(point, ${this.u_data}[i].xyz, ${this.u_data}[i].w);
		
		if(distance < minDistance) {
			minDistance = distance;
			nearestIndex = i;
		}
	}
	
	return minDistance;
}`
}

class Box extends Shape {
  boxIntersection = Symbol()
  boxNormal = Symbol()
  boxSDF = Symbol()
  template = glsl`

#define NUM_BOXES ${NUM_BOXES}

struct Box {
	vec3 position;
	float size;
	vec3 color;
};

${uniform.vec4(this.u_data, { size: NUM_BOXES })}
${uniform.vec3(this.u_colors, { size: NUM_BOXES })}

float ${this.boxIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in Box box)
{
	// Ray-box intersection using slab method
	// A box is defined by 6 planes, we find where the ray enters and exits each pair of parallel planes
	
	vec3 boxMin = box.position - vec3(box.size);
	vec3 boxMax = box.position + vec3(box.size);
	
	// Calculate intersection distances for each axis
	vec3 invDir = 1.0 / rayDirection;
	vec3 t1 = (boxMin - rayOrigin) * invDir;
	vec3 t2 = (boxMax - rayOrigin) * invDir;
	
	// Find the min and max for each axis (handles negative direction)
	vec3 tMin = min(t1, t2);
	vec3 tMax = max(t1, t2);
	
	// The ray enters the box at the maximum of all tMin values
	float tNear = max(max(tMin.x, tMin.y), tMin.z);
	
	// The ray exits the box at the minimum of all tMax values  
	float tFar = min(min(tMax.x, tMax.y), tMax.z);
	
	// If tNear > tFar, ray misses the box
	// If tFar < 0, box is behind the ray
	if(tNear > tFar || tFar < 0.0) {
		return -1.0;
	}
	
	// Return the nearest intersection (tNear, unless we're inside the box)
	return tNear > 0.0 ? tNear : tFar;
}

// Calculate normal vector at hit point on box surface
vec3 ${this.boxNormal}(in vec3 hitPosition, in Box box)
{
	// Find which face of the box we hit by checking which coordinate is closest to the box boundary
	vec3 localPos = hitPosition - box.position;
	vec3 absLocal = abs(localPos);
	
	// Return normal for the face that's closest to the box size
	if(absLocal.x > absLocal.y && absLocal.x > absLocal.z) {
		return vec3(sign(localPos.x), 0.0, 0.0);
	} else if(absLocal.y > absLocal.z) {
		return vec3(0.0, sign(localPos.y), 0.0);
	} else {
		return vec3(0.0, 0.0, sign(localPos.z));
	}
}

// Find closest box intersection, returns distance and sets hitIndex and hitType
float ${this.calculateIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in float maxDistance, out int hitIndex, out int hitType)
{
	float closestDistance = maxDistance;
	hitIndex = -1;
	hitType = -1;
	
	for(int i = 0; i < ${NUM_BOXES}; i++) {
		Box box = Box(${this.u_data}[i].xyz, ${this.u_data}[i].w, ${this.u_colors}[i]);
		float distance = ${this.boxIntersection}(rayOrigin, rayDirection, box);
		
		if(distance > 0.0 && distance < closestDistance) {
			closestDistance = distance;
			hitIndex = i;
			hitType = ${this.id};
		}
	}
	
	return hitIndex >= 0 ? closestDistance : -1.0;
}

// Calculate box normal and color at hit point
void ${this.calculateColor}(in vec3 hitPosition, in int hitIndex, out vec3 normal, out vec3 color)
{
	Box hitBox = Box(${this.u_data}[hitIndex].xyz, ${this.u_data}[hitIndex].w, ${this.u_colors}[hitIndex]);
	normal = ${this.boxNormal}(hitPosition, hitBox);
	color = ${this.u_colors}[hitIndex];
}

// Signed distance function for box
float ${this.boxSDF}(in vec3 point, in vec3 center, in float size)
{
	vec3 d = abs(point - center) - vec3(size);
	return length(max(d, vec3(0.0))) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Calculate SDF for all boxes
float ${this.calculateSDF}(in vec3 point, out int nearestIndex, out float minDistance)
{
	minDistance = 1000.0;
	nearestIndex = -1;
	
	for(int i = 0; i < ${NUM_BOXES}; i++) {
		float distance = ${this.boxSDF}(point, ${this.u_data}[i].xyz, ${this.u_data}[i].w);
		
		if(distance < minDistance) {
			minDistance = distance;
			nearestIndex = i;
		}
	}
	
	return minDistance;
}
`
}

class Torus extends Shape {
  torusIntersection = Symbol()
  torusNormal = Symbol()
  torusSDF = Symbol()

  setData(positions: Float32Array, radii: Float32Array) {
    this.view?.uniforms[this.u_positions]?.set(positions)
    this.view?.uniforms[this.u_radii]?.set(radii)
    return this
  }

  template = glsl`

#define NUM_TORI ${NUM_TORI}

struct Torus {
	vec3 position;
	float majorRadius;
	float minorRadius;
	vec3 color;
};

${uniform.vec3(this.u_positions, { size: NUM_TORI })}
${uniform.vec2(this.u_radii, { size: NUM_TORI })}
${uniform.vec3(this.u_colors, { size: NUM_TORI })}

// Signed distance function for torus
float ${this.torusSDF}(in vec3 point, in vec3 center, in float majorRadius, in float minorRadius)
{
	vec3 p = point - center;
	vec2 q = vec2(length(p.xz) - majorRadius, p.y);
	return length(q) - minorRadius;
}

// Calculate SDF for all tori
float ${this.calculateSDF}(in vec3 point, out int nearestIndex, out float minDistance)
{
	minDistance = 1000.0;
	nearestIndex = -1;
	
	for(int i = 0; i < ${NUM_TORI}; i++) {
		float distance = ${this.torusSDF}(point, ${this.u_positions}[i], ${this.u_radii}[i].x, ${this.u_radii}[i].y);
		
		if(distance < minDistance) {
			minDistance = distance;
			nearestIndex = i;
		}
	}
	
	return minDistance;
}

// Torus intersection for fallback rendering
float ${this.torusIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in Torus torus)
{
	// Simplified intersection - not exact but good enough for fallback
	return ${this.torusSDF}(rayOrigin, torus.position, torus.majorRadius, torus.minorRadius);
}

// Calculate torus normal
vec3 ${this.torusNormal}(in vec3 hitPosition, in Torus torus)
{
	vec3 p = hitPosition - torus.position;
	float len = length(vec2(p.x, p.z));
	vec3 d = vec3(p.x, 0.0, p.z) / len;
	return normalize(p - d * torus.majorRadius);
}

// Find closest torus intersection
float ${this.calculateIntersection}(in vec3 rayOrigin, in vec3 rayDirection, in float maxDistance, out int hitIndex, out int hitType)
{
	float closestDistance = maxDistance;
	hitIndex = -1;
	hitType = -1;
	
	for(int i = 0; i < ${NUM_TORI}; i++) {
		Torus torus = Torus(${this.u_positions}[i], ${this.u_radii}[i].x, ${this.u_radii}[i].y, ${this.u_colors}[i]);
		float distance = ${this.torusIntersection}(rayOrigin, rayDirection, torus);
		
		if(distance > 0.0 && distance < closestDistance) {
			closestDistance = distance;
			hitIndex = i;
			hitType = ${this.id};
		}
	}
	
	return hitIndex >= 0 ? closestDistance : -1.0;
}

// Calculate torus normal and color at hit point
void ${this.calculateColor}(in vec3 hitPosition, in int hitIndex, out vec3 normal, out vec3 color)
{
	Torus hitTorus = Torus(${this.u_positions}[hitIndex], ${this.u_radii}[hitIndex].x, ${this.u_radii}[hitIndex].y, ${this.u_colors}[hitIndex]);
	normal = ${this.torusNormal}(hitPosition, hitTorus);
	color = ${this.u_colors}[hitIndex];
}
`
}

const box = new Box()
const sphere = new Sphere()
const torus = new Torus()
const camera = new Camera()

const shapes = [box, sphere, torus]

const { program, view } = compile.toQuad(
  gl,
  glsl`#version 300 es
precision mediump float;

struct HitInfo {
	bool hit;
	float distance;
	vec3 position;
	vec3 normal;
	vec3 color;
};

${shapes.map(shape => shape.template)}

${camera.template}
${uniform.float('aspectRatio')}
${uniform.float('u_blendFactor')}

in vec2 v_uv;
out vec4 fragColor;

vec3 lightPos = vec3(5.0, 5.0, 5.0);

// Smooth minimum function for blending SDFs
float smoothMin(float a, float b, float k) {
	float h = max(k - abs(a - b), 0.0);
	return min(a, b) - h * h * 0.25 / k;
}

// Structure to hold shape contribution info
struct ShapeContribution {
	float distance;
	int shapeType;
	int index;
	float weight;
};

// Combined SDF function that blends all shapes and calculates color weights
float combinedSDF(in vec3 point, out vec3 blendedColor)
{
	ShapeContribution shapes[${shapes.length}];
	float totalWeight = 0.0;
	blendedColor = vec3(0.0);
	
	${shapes.map((shape, i) => {
    const index = Symbol()
    const minDist = Symbol()
    return glsl`
	int ${index};
	float ${minDist};
	shapes[${i}].distance = ${shape.calculateSDF}(point, ${index}, ${minDist});
	shapes[${i}].shapeType = ${shape.id};
	shapes[${i}].index = ${index};
	`
  })}
	
	// Calculate blended distance using smooth minimum
	float blendedDist = shapes[0].distance;
	for(int i = 1; i < ${shapes.length}; i++) {
		blendedDist = smoothMin(blendedDist, shapes[i].distance, u_blendFactor);
	}
	
	// Calculate weights based on how close each shape is to the blended surface
	for(int i = 0; i < ${shapes.length}; i++) {
		float diff = abs(shapes[i].distance - blendedDist);
		// Use exponential falloff with sharper cutoff for more vibrant colors
		shapes[i].weight = exp(-diff * 20.0 / u_blendFactor);
		totalWeight += shapes[i].weight;
	}
	
	// Normalize weights and blend colors
	if(totalWeight > 0.0) {
		${shapes.map(
      (shape, i) => glsl`
		if(shapes[${i}].index >= 0) {
			vec3 shapeColor = ${shape.u_colors}[shapes[${i}].index];
			blendedColor += shapeColor * (shapes[${i}].weight / totalWeight);
		}`,
    )}
	}
	
	return blendedDist;
}

// Calculate normal using gradient of SDF
vec3 calculateSDFNormal(in vec3 point) {
	const float eps = ${NORMAL_EPSILON};
	vec3 dummyColor;
	
	float center = combinedSDF(point, dummyColor);
	float dx = combinedSDF(point + vec3(eps, 0.0, 0.0), dummyColor) - center;
	float dy = combinedSDF(point + vec3(0.0, eps, 0.0), dummyColor) - center;
	float dz = combinedSDF(point + vec3(0.0, 0.0, eps), dummyColor) - center;
	
	return normalize(vec3(dx, dy, dz));
}

vec3 calculateLighting(in vec3 position, in vec3 normal, in vec3 color)
{
	vec3 lightDirection = normalize(lightPos - position);
	float diffuse = max(0.0, dot(normal, lightDirection));
	return color * (diffuse * 0.8 + 0.2); // 80% diffuse + 20% ambient
}

// Raymarching with SDF
bool raymarch(in vec3 rayOrigin, in vec3 rayDirection, out vec3 hitPosition, out vec3 hitColor)
{
	float t = 0.0;
	for(int i = 0; i < ${RAY_MARCH_ITERATIONS}; i++) {
		hitPosition = rayOrigin + t * rayDirection;
		float dist = combinedSDF(hitPosition, hitColor);
		
		if(dist < ${RAY_HIT_THRESHOLD}) {
			return true;
		}
		
		t += dist;
		
		if(t > 100.0) {
			break;
		}
	}
	return false;
}

void main()
{	
	// Ray from camera through pixel using camera vectors
	vec3 rayOrigin = u_cameraPos;
	vec3 rayDirection = normalize(u_cameraDir + v_uv.x * u_cameraRight * aspectRatio + v_uv.y * u_cameraUp);
	
	vec3 color = vec3(0.1, 0.1, 0.2); // Background color
	
	vec3 hitPosition;
	vec3 hitColor;
	
	if(raymarch(rayOrigin, rayDirection, hitPosition, hitColor)) {
		// Calculate normal using SDF gradient
		vec3 normal = calculateSDFNormal(hitPosition);
		
		// Use the blended color from raymarch
		color = calculateLighting(hitPosition, normal, hitColor);
	}
	
	// Gamma correction
	// color = pow(color, vec3(1.0 / 2.2));
	
	fragColor = vec4(color, 1.0);
}`,
)

gl.useProgram(program)

// Set view for all shapes
shapes.forEach(shape => (shape.view = view))

// Bind quad buffer
view.attributes.a_quad.bind()

sphere.setData(SPHERE_FLOAT_ARRAYS.positions).setColors(SPHERE_FLOAT_ARRAYS.colors)
box.setData(BOX_FLOAT_ARRAYS.positions).setColors(BOX_FLOAT_ARRAYS.colors)
torus
  .setData(TORUS_FLOAT_ARRAYS.positions, TORUS_FLOAT_ARRAYS.radii)
  .setColors(TORUS_FLOAT_ARRAYS.colors)

// Set initial aspect ratio
view.uniforms.aspectRatio.set(canvas.width / canvas.height)
view.uniforms.u_blendFactor.set(blendFactor)

// Set view for camera
camera.view = view
camera.update()

function animate(timestamp: number) {
  const time = timestamp / 1000

  // Make the center sphere pulse
  const pulseFactor = 1.0 + 0.3 * Math.sin(time * 2)
  SPHERE_FLOAT_ARRAYS.positions[3] = pulseFactor // Update radius of sphere 0

  // Orbit some spheres - smaller radius for more overlap
  const orbitRadius = 1.5

  // Update sphere 1 - slower movement
  SPHERE_FLOAT_ARRAYS.positions[4] = 1.5 + Math.cos(time * 0.4) * orbitRadius * 0.5
  SPHERE_FLOAT_ARRAYS.positions[5] = 0.5 + Math.sin(time * 0.6) * 0.8
  SPHERE_FLOAT_ARRAYS.positions[6] = -1 + Math.sin(time * 0.4) * orbitRadius * 0.5

  // Update sphere 2 - slower movement
  SPHERE_FLOAT_ARRAYS.positions[8] = -1.5 + Math.cos(time * 0.3 + Math.PI) * orbitRadius * 0.5
  SPHERE_FLOAT_ARRAYS.positions[9] = -0.5 + Math.cos(time * 0.5) * 0.6
  SPHERE_FLOAT_ARRAYS.positions[10] = 0.5 + Math.sin(time * 0.3 + Math.PI) * orbitRadius * 0.5

  // Sphere 3 - gentle vertical motion near boxes
  SPHERE_FLOAT_ARRAYS.positions[13] = 1.5 + Math.sin(time * 0.8) * 0.5 // y position

  // Sphere 4 - small circular motion
  SPHERE_FLOAT_ARRAYS.positions[16] = -1 + Math.sin(time * 0.4) * 0.8 // x
  SPHERE_FLOAT_ARRAYS.positions[17] = -1.5 + Math.sin(time * 0.6) * 0.5 // y
  SPHERE_FLOAT_ARRAYS.positions[18] = 1 + Math.cos(time * 0.4) * 0.3 // z

  // Sphere 5 - gentle motion + size change
  SPHERE_FLOAT_ARRAYS.positions[20] = 2 + Math.cos(time * 0.3) * 0.7 // x
  SPHERE_FLOAT_ARRAYS.positions[22] = -1.5 + Math.sin(time * 0.3) * 0.5 // z
  SPHERE_FLOAT_ARRAYS.positions[23] = 0.7 + 0.2 * Math.sin(time * 2) // radius

  // Sphere 6 - slow wave motion
  SPHERE_FLOAT_ARRAYS.positions[24] = -2 + Math.sin(time * 0.4) * 0.5 // x
  SPHERE_FLOAT_ARRAYS.positions[25] = 1 + Math.sin(time * 0.6) * 0.4 // y

  // Sphere 7 - gentle rotation
  SPHERE_FLOAT_ARRAYS.positions[28] = Math.cos(time * 0.3) * 1.2 // x
  SPHERE_FLOAT_ARRAYS.positions[29] = -0.5 + Math.sin(time * 0.3) * 0.3 // y

  // Animate colors for more spheres
  SPHERE_FLOAT_ARRAYS.colors[0] = 0.5 + 0.5 * Math.sin(time * 3) // Red channel of sphere 0
  SPHERE_FLOAT_ARRAYS.colors[4] = 0.5 + 0.5 * Math.cos(time * 2) // Green channel of sphere 1
  SPHERE_FLOAT_ARRAYS.colors[9] = 0.5 + 0.5 * Math.sin(time * 2.5) // Blue channel of sphere 3
  SPHERE_FLOAT_ARRAYS.colors[15] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8)) // All channels sphere 5 (pulsing cyan)
  SPHERE_FLOAT_ARRAYS.colors[16] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))
  SPHERE_FLOAT_ARRAYS.colors[17] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))

  // Animate some boxes
  // Box 0 - gentle motion near spheres
  BOX_FLOAT_ARRAYS.positions[0] = 1 + Math.cos(time * 0.35) * 0.3 // x
  BOX_FLOAT_ARRAYS.positions[2] = -0.5 + Math.sin(time * 0.35) * 0.3 // z

  // Box 1 - scale pulsing
  BOX_FLOAT_ARRAYS.positions[7] = 0.8 + 0.2 * Math.sin(time * 1.5) // size

  // Box 2 - gentle vertical motion
  BOX_FLOAT_ARRAYS.positions[9] = -1 + Math.sin(time * 0.4) * 0.3 // y

  // Animate tori
  // Torus 0 - rotate major radius
  TORUS_FLOAT_ARRAYS.radii[0] = 0.8 + 0.2 * Math.sin(time * 1.2) // major radius

  // Torus 1 - orbit around center
  TORUS_FLOAT_ARRAYS.positions[3] = -1.5 + Math.cos(time * 0.5) * 0.5 // x
  TORUS_FLOAT_ARRAYS.positions[5] = Math.sin(time * 0.5) * 0.5 // z

  // Torus 2 - vertical motion
  TORUS_FLOAT_ARRAYS.positions[7] = -0.5 + Math.sin(time * 0.7) * 0.3 // y

  // Torus 3 - pulsing minor radius
  TORUS_FLOAT_ARRAYS.radii[7] = 0.2 + 0.1 * Math.sin(time * 2) // minor radius

  // Update the uniform arrays with the animated data
  sphere.setData(SPHERE_FLOAT_ARRAYS.positions).setColors(SPHERE_FLOAT_ARRAYS.colors)
  box.setData(BOX_FLOAT_ARRAYS.positions).setColors(BOX_FLOAT_ARRAYS.colors)
  torus
    .setData(TORUS_FLOAT_ARRAYS.positions, TORUS_FLOAT_ARRAYS.radii)
    .setColors(TORUS_FLOAT_ARRAYS.colors)

  // Animate blend factor with larger variation for more visible blending
  blendFactor = 0.5 + 0.4 * Math.sin(time * 0.3)
  view.uniforms.u_blendFactor.set(blendFactor)
}

// Mouse controls
canvas.addEventListener('mousedown', e => {
  camera.startDrag(e.clientX, e.clientY)
})

canvas.addEventListener('mousemove', e => {
  camera.drag(e.clientX, e.clientY)
})

canvas.addEventListener('mouseup', () => {
  camera.endDrag()
})

canvas.addEventListener('mouseleave', () => {
  camera.endDrag()
})

// Mouse wheel for zoom
canvas.addEventListener('wheel', e => {
  e.preventDefault()
  camera.zoom(e.deltaY)
})

// Touch controls
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    camera.startDrag(e.touches[0].clientX, e.touches[0].clientY)
  }
})

canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1) {
    camera.drag(e.touches[0].clientX, e.touches[0].clientY)
  }
})

canvas.addEventListener('touchend', () => {
  camera.endDrag()
})

// Animation loop
function draw(timestamp: number) {
  if (controller.signal.aborted) return

  camera.update()
  animate(timestamp)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  requestAnimationFrame(draw)
}

requestAnimationFrame(draw)

// Handle canvas resizing
new ResizeObserver(() => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  gl.viewport(0, 0, canvas.width, canvas.height)

  // Update aspect ratio uniform
  view.uniforms.aspectRatio.set(canvas.width / canvas.height)
  draw(performance.now())
}).observe(document.body)
