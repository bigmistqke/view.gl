import { compile, glsl, uniform } from '../../../src/tag.ts'
import { GLSL, GLSLToView } from '../../../src/types.ts'
import { dom } from '../utils.ts'

const NUM_SPHERES = 8
const NUM_BOXES = 3

const SPHERE_DATA = {
  // Sphere data: [x, y, z, radius]
  data: [
    [0, 0, 0, 1.2], // Center sphere - larger for more overlap
    [1.5, 0.5, -1, 1.0], // Right sphere - closer to center
    [-1.5, -0.5, 0.5, 1.0], // Left sphere - closer to center
    [0.5, 1.5, -0.5, 0.9], // Top sphere - closer to center
    [-1, -1.5, 1, 0.8], // Bottom sphere - closer to center
    [2, -1, -1.5, 0.7], // Far right sphere - closer
    [-2, 1, 1.5, 0.9], // Far left sphere - closer
    [0, -0.5, -2, 1.0], // Back sphere - closer
  ] as const,
  colors: [
    [1.0, 0.3, 0.3], // Red
    [0.3, 1.0, 0.3], // Green
    [0.3, 0.3, 1.0], // Blue
    [1.0, 1.0, 0.3], // Yellow
    [1.0, 0.3, 1.0], // Magenta
    [0.3, 1.0, 1.0], // Cyan
    [1.0, 0.7, 0.3], // Orange
    [0.7, 0.3, 1.0], // Purple
  ] as const,
}

const BOX_DATA = {
  // Box data: [x, y, z, size] (size is half-extents for all dimensions)
  data: [
    [1, 0, -0.5, 0.9], // Right box - closer to center, larger
    [-1, 0, 0.5, 0.8], // Left box - closer to center, larger
    [0, -1, -1, 0.9], // Bottom box - closer to center, larger
  ] as const,
  // Box colors (RGB)
  colors: [
    [0.8, 0.8, 0.2], // Yellow-green
    [0.2, 0.8, 0.8], // Cyan
    [0.8, 0.2, 0.8], // Magenta
  ] as const,
}
// Create typed arrays for sphere data and colors
const SPHERE_FLOAT_ARRAYS = {
  data: new Float32Array(SPHERE_DATA.data.flat()),
  colors: new Float32Array(SPHERE_DATA.colors.flat()),
}

// Create typed arrays for box data and colors
const BOX_FLOAT_ARRAYS = {
  data: new Float32Array(BOX_DATA.data.flat()),
  colors: new Float32Array(BOX_DATA.colors.flat()),
}

let SHAPE_COUNTER = 0

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

const box = new Box()
const sphere = new Sphere()
const shapes = [box, sphere]

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

// Combined SDF function that blends all shapes
float combinedSDF(in vec3 point, out int nearestShapeType, out int nearestIndex)
{
	float minDistance = 1000.0;
	nearestShapeType = -1;
	nearestIndex = -1;
	
	${shapes.map((shape, i) => {
		const index = Symbol()
		const minDist = Symbol()
		const sdf = Symbol()
		return glsl`
	int ${index};
	float ${minDist};
	float ${sdf} = ${shape.calculateSDF}(point, ${index}, ${minDist});
	
	if(${i} == 0) {
		minDistance = ${sdf};
		nearestShapeType = ${shape.id};
		nearestIndex = ${index};
	} else {
		float oldMin = minDistance;
		minDistance = smoothMin(minDistance, ${sdf}, u_blendFactor);
		
		// Update nearest shape info based on which shape contributes more to the blend
		if(abs(${sdf} - minDistance) < abs(oldMin - minDistance)) {
			nearestShapeType = ${shape.id};
			nearestIndex = ${index};
		}
	}`
	})}
	
	return minDistance;
}

// Calculate normal using gradient of SDF
vec3 calculateSDFNormal(in vec3 point) {
	const float eps = 0.001;
	int dummy1, dummy2;
	
	float center = combinedSDF(point, dummy1, dummy2);
	float dx = combinedSDF(point + vec3(eps, 0.0, 0.0), dummy1, dummy2) - center;
	float dy = combinedSDF(point + vec3(0.0, eps, 0.0), dummy1, dummy2) - center;
	float dz = combinedSDF(point + vec3(0.0, 0.0, eps), dummy1, dummy2) - center;
	
	return normalize(vec3(dx, dy, dz));
}

vec3 calculateLighting(in vec3 position, in vec3 normal, in vec3 color)
{
	vec3 lightDirection = normalize(lightPos - position);
	float diffuse = max(0.0, dot(normal, lightDirection));
	return color * (diffuse * 0.8 + 0.2); // 80% diffuse + 20% ambient
}

// Raymarching with SDF
bool raymarch(in vec3 rayOrigin, in vec3 rayDirection, out vec3 hitPosition, out int hitType, out int hitIndex)
{
	float t = 0.0;
	for(int i = 0; i < 128; i++) {
		hitPosition = rayOrigin + t * rayDirection;
		float dist = combinedSDF(hitPosition, hitType, hitIndex);
		
		if(dist < 0.001) {
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
	// Ray from camera through pixel
	vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
	vec3 rayDirection = normalize(vec3(v_uv.x * aspectRatio, v_uv.y, -1.0));
	
	vec3 color = vec3(0.1, 0.1, 0.2); // Background color
	
	vec3 hitPosition;
	int hitType, hitIndex;
	
	if(raymarch(rayOrigin, rayDirection, hitPosition, hitType, hitIndex)) {
		// Calculate normal using SDF gradient
		vec3 normal = calculateSDFNormal(hitPosition);
		
		// Get color from the nearest shape
		vec3 hitColor;
		switch(hitType) {
			${shapes.map(shape => glsl`
			case ${shape.id}:
				hitColor = ${shape.u_colors}[hitIndex];
				break;`)}
			default:
				hitColor = vec3(1.0, 0.0, 1.0); // Error color
		}
		
		color = calculateLighting(hitPosition, normal, hitColor);
	}
	
	// Gamma correction
	color = pow(color, vec3(1.0 / 2.2));
	
	fragColor = vec4(color, 1.0);
}`,
)

gl.useProgram(program)

// Set view for all shapes
shapes.forEach(shape => shape.view = view)

// Bind quad buffer
view.attributes.a_quad.bind()

sphere.setData(SPHERE_FLOAT_ARRAYS.data).setColors(SPHERE_FLOAT_ARRAYS.colors)
box.setData(BOX_FLOAT_ARRAYS.data).setColors(BOX_FLOAT_ARRAYS.colors)

// Set initial aspect ratio
view.uniforms.aspectRatio.set(canvas.width / canvas.height)
view.uniforms.u_blendFactor.set(blendFactor)

function animate(timestamp: number) {
  const time = timestamp / 1000

  // Make the center sphere pulse
  const pulseFactor = 1.0 + 0.3 * Math.sin(time * 2)
  SPHERE_FLOAT_ARRAYS.data[3] = pulseFactor // Update radius of sphere 0

  // Orbit some spheres - smaller radius for more overlap
  const orbitRadius = 1.5

  // Update sphere 1 - slower movement
  SPHERE_FLOAT_ARRAYS.data[4] = 1.5 + Math.cos(time * 0.4) * orbitRadius * 0.5
  SPHERE_FLOAT_ARRAYS.data[5] = 0.5 + Math.sin(time * 0.6) * 0.8
  SPHERE_FLOAT_ARRAYS.data[6] = -1 + Math.sin(time * 0.4) * orbitRadius * 0.5

  // Update sphere 2 - slower movement
  SPHERE_FLOAT_ARRAYS.data[8] = -1.5 + Math.cos(time * 0.3 + Math.PI) * orbitRadius * 0.5
  SPHERE_FLOAT_ARRAYS.data[9] = -0.5 + Math.cos(time * 0.5) * 0.6
  SPHERE_FLOAT_ARRAYS.data[10] = 0.5 + Math.sin(time * 0.3 + Math.PI) * orbitRadius * 0.5

  // Sphere 3 - gentle vertical motion near boxes
  SPHERE_FLOAT_ARRAYS.data[13] = 1.5 + Math.sin(time * 0.8) * 0.5 // y position

  // Sphere 4 - small circular motion
  SPHERE_FLOAT_ARRAYS.data[16] = -1 + Math.sin(time * 0.4) * 0.8 // x
  SPHERE_FLOAT_ARRAYS.data[17] = -1.5 + Math.sin(time * 0.6) * 0.5 // y
  SPHERE_FLOAT_ARRAYS.data[18] = 1 + Math.cos(time * 0.4) * 0.3 // z

  // Sphere 5 - gentle motion + size change
  SPHERE_FLOAT_ARRAYS.data[20] = 2 + Math.cos(time * 0.3) * 0.7 // x
  SPHERE_FLOAT_ARRAYS.data[22] = -1.5 + Math.sin(time * 0.3) * 0.5 // z
  SPHERE_FLOAT_ARRAYS.data[23] = 0.7 + 0.2 * Math.sin(time * 2) // radius

  // Sphere 6 - slow wave motion
  SPHERE_FLOAT_ARRAYS.data[24] = -2 + Math.sin(time * 0.4) * 0.5 // x
  SPHERE_FLOAT_ARRAYS.data[25] = 1 + Math.sin(time * 0.6) * 0.4 // y

  // Sphere 7 - gentle rotation
  SPHERE_FLOAT_ARRAYS.data[28] = Math.cos(time * 0.3) * 1.2 // x
  SPHERE_FLOAT_ARRAYS.data[29] = -0.5 + Math.sin(time * 0.3) * 0.3 // y

  // Animate colors for more spheres
  SPHERE_FLOAT_ARRAYS.colors[0] = 0.5 + 0.5 * Math.sin(time * 3) // Red channel of sphere 0
  SPHERE_FLOAT_ARRAYS.colors[4] = 0.5 + 0.5 * Math.cos(time * 2) // Green channel of sphere 1
  SPHERE_FLOAT_ARRAYS.colors[9] = 0.5 + 0.5 * Math.sin(time * 2.5) // Blue channel of sphere 3
  SPHERE_FLOAT_ARRAYS.colors[15] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8)) // All channels sphere 5 (pulsing cyan)
  SPHERE_FLOAT_ARRAYS.colors[16] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))
  SPHERE_FLOAT_ARRAYS.colors[17] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))

  // Animate some boxes
  // Box 0 - gentle motion near spheres
  BOX_FLOAT_ARRAYS.data[0] = 1 + Math.cos(time * 0.35) * 0.3 // x
  BOX_FLOAT_ARRAYS.data[2] = -0.5 + Math.sin(time * 0.35) * 0.3 // z

  // Box 1 - scale pulsing
  BOX_FLOAT_ARRAYS.data[7] = 0.8 + 0.2 * Math.sin(time * 1.5) // size

  // Box 2 - gentle vertical motion
  BOX_FLOAT_ARRAYS.data[9] = -1 + Math.sin(time * 0.4) * 0.3 // y

  // Update the uniform arrays with the animated data
  sphere.setData(SPHERE_FLOAT_ARRAYS.data).setColors(SPHERE_FLOAT_ARRAYS.colors)
  box.setData(BOX_FLOAT_ARRAYS.data).setColors(BOX_FLOAT_ARRAYS.colors)

  // Animate blend factor with larger variation for more visible blending
  blendFactor = 0.5 + 0.4 * Math.sin(time * 0.3)
  view.uniforms.u_blendFactor.set(blendFactor)
}

// Animation loop
function draw(timestamp: number) {
  if (controller.signal.aborted) return

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
