import { attribute, compile, glsl, uniform } from '@bigmistqke/view.gl/tag'
import { dom } from '../utils.ts'

// Sphere data: [x, y, z, radius]
const sphereData = [
  [0, 0, 0, 1.0], // Center sphere
  [3, 1, -2, 0.8], // Right sphere
  [-3, -1, 1, 0.9], // Left sphere
  [1, 3, -1, 0.7], // Top sphere
  [-2, -3, 2, 0.6], // Bottom sphere
  [4, -2, -3, 0.5], // Far right sphere
  [-4, 2, 3, 0.8], // Far left sphere
  [0, -1, -4, 1.2], // Back sphere
] as const

// Sphere colors (RGB)
const sphereColors = [
  [1.0, 0.3, 0.3], // Red
  [0.3, 1.0, 0.3], // Green
  [0.3, 0.3, 1.0], // Blue
  [1.0, 1.0, 0.3], // Yellow
  [1.0, 0.3, 1.0], // Magenta
  [0.3, 1.0, 1.0], // Cyan
  [1.0, 0.7, 0.3], // Orange
  [0.7, 0.3, 1.0], // Purple
] as const

const controller = new AbortController()
const canvas = dom('canvas', { parentElement: document.body })

const gl = canvas.getContext('webgl2')!

const vertex = glsl`#version 300 es
precision mediump float;

${attribute.vec2('a_vertex')}

out vec2 uv;

void main() {
  uv = a_vertex;
  gl_Position = vec4(uv, 0.0,  1.0);
}`

const NUM_SPHERES = 8

const fragment = glsl`#version 300 es
precision mediump float;

#define NUM_SPHERES ${NUM_SPHERES}

struct Sphere {
	vec3 position;
	float radius;
	vec3 color;
};

${uniform.vec4('sphereData', { size: NUM_SPHERES })}
${uniform.vec3('colors', { size: NUM_SPHERES })}
${uniform.float('aspectRatio')}

in vec2 uv;
out vec4 fragColor;

vec3 lightPos = vec3(5.0, 5.0, 5.0);

float sphereIntersection(in vec3 rayOrigin, in vec3 rayDirection, in Sphere sphere)
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
vec3 sphereNormal(in vec3 hitPosition, in Sphere sphere)
{
	return (hitPosition - sphere.position) / sphere.radius;
}

bool intersectSpheres(in vec3 rayOrigin, in vec3 rayDirection, out float hitDistance, out Sphere hitSphere)
{
	hitDistance = 1000.0;
	bool foundHit = false;
	
	for(int i = 0; i < NUM_SPHERES; i++) {
		Sphere sphere = Sphere(sphereData[i].xyz, sphereData[i].w, colors[i]);
		float distance = sphereIntersection(rayOrigin, rayDirection, sphere);
		
		if(distance > 0.0 && distance < hitDistance) {
			foundHit = true;
			hitDistance = distance;
			hitSphere = sphere;
		}
	}
	
	return foundHit;
}

void main()
{	
	// Ray from camera through pixel
	vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
	vec3 rayDirection = normalize(vec3(uv.x * aspectRatio, uv.y, -1.0));
	
	// Find closest sphere intersection
	float hitDistance;
	Sphere hitSphere;
	
	vec3 color = vec3(0.1, 0.1, 0.2); // Background color
	
	if(intersectSpheres(rayOrigin, rayDirection, hitDistance, hitSphere))
	{
		// Calculate hit position and normal
		vec3 hitPosition = rayOrigin + hitDistance * rayDirection;
		vec3 normal = sphereNormal(hitPosition, hitSphere);
		
		// Simple lighting
		vec3 lightDirection = normalize(lightPos - hitPosition);
		float diffuse = max(0.0, dot(normal, lightDirection));
		
		// Apply sphere color with lighting
		color = hitSphere.color * (diffuse * 0.8 + 0.2); // 80% diffuse + 20% ambient
	}
	
	// Gamma correction
	color = pow(color, vec3(1.0 / 2.2));
	
	fragColor = vec4(color, 1.0);
}`

const { program, view } = compile(gl, vertex, fragment)

gl.useProgram(program)

// Create triangle vertex buffer
view.attributes.a_vertex.set(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])).bind()

// Create typed arrays for sphere data and colors
const spheresArray = new Float32Array(
  (function* () {
    for (const sphere of sphereData) {
      yield sphere[0]
      yield sphere[1]
      yield sphere[2]
      yield sphere[3]
    }
  })(),
)
const colorsArray = new Float32Array(
  (function* () {
    for (const color of sphereColors) {
      yield color[0]
      yield color[1]
      yield color[2]
    }
  })(),
)

// Set the uniform arrays
view.uniforms.sphereData.set(spheresArray)
view.uniforms.colors.set(colorsArray)

// Set initial aspect ratio
view.uniforms.aspectRatio.set(canvas.width / canvas.height)

function animate(timestamp: number) {
  const time = timestamp / 1000

  // Make the center sphere pulse
  const pulseFactor = 0.8 + 0.4 * Math.sin(time * 2)
  spheresArray[3] = pulseFactor // Update radius of sphere 0

  // Orbit some spheres
  const orbitRadius = 2.5

  // Update sphere 1
  spheresArray[4] = Math.cos(time * 0.8) * orbitRadius
  spheresArray[5] = Math.sin(time * 1.2) * 1.5
  spheresArray[6] = Math.sin(time * 0.8) * orbitRadius

  // Update sphere 2
  spheresArray[8] = Math.cos(time * 0.6 + Math.PI) * orbitRadius
  spheresArray[9] = Math.cos(time * 0.9) * 1.2
  spheresArray[10] = Math.sin(time * 0.6 + Math.PI) * orbitRadius

  // Sphere 3 - vertical bobbing
  spheresArray[13] = 1 + Math.sin(time * 1.5) * 2 // y position

  // Sphere 4 - figure-8 motion
  spheresArray[16] = Math.sin(time * 0.7) * 2.5 // x
  spheresArray[17] = Math.sin(time * 1.4) * 1.5 // y
  spheresArray[18] = -2 + Math.cos(time * 0.7) // z

  // Sphere 5 - circular motion + size change
  spheresArray[20] = Math.cos(time) * 3.5 // x
  spheresArray[22] = Math.sin(time) * 3.5 // z
  spheresArray[23] = 0.4 + 0.2 * Math.sin(time * 3) // radius

  // Sphere 6 - diagonal wave motion
  spheresArray[24] = -4 + Math.sin(time * 0.8) * 1.5 // x
  spheresArray[25] = 2 + Math.sin(time * 1.2) * 1 // y

  // Sphere 7 - rotating in back
  spheresArray[28] = Math.cos(time * 0.5) * 2 // x
  spheresArray[29] = -1 + Math.sin(time * 0.5) * 0.5 // y

  // Animate colors for more spheres
  colorsArray[0] = 0.5 + 0.5 * Math.sin(time * 3) // Red channel of sphere 0
  colorsArray[4] = 0.5 + 0.5 * Math.cos(time * 2) // Green channel of sphere 1
  colorsArray[9] = 0.5 + 0.5 * Math.sin(time * 2.5) // Blue channel of sphere 3
  colorsArray[15] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8)) // All channels sphere 5 (pulsing cyan)
  colorsArray[16] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))
  colorsArray[17] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8))

  // Update the uniform arrays with the animated data
  view.uniforms.sphereData?.set(spheresArray)
  view.uniforms.colors?.set(colorsArray)
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
}).observe(document.body)
