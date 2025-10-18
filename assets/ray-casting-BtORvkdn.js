import { u as uniform, g as glsl, c as compile } from './tag-B1IdZ_8z.js';
import { d as dom } from './utils-2dzuv_bW.js';

const sphereData = [
  [0, 0, 0, 1],
  // Center sphere
  [3, 1, -2, 0.8],
  // Right sphere
  [-3, -1, 1, 0.9],
  // Left sphere
  [1, 3, -1, 0.7],
  // Top sphere
  [-2, -3, 2, 0.6],
  // Bottom sphere
  [4, -2, -3, 0.5],
  // Far right sphere
  [-4, 2, 3, 0.8],
  // Far left sphere
  [0, -1, -4, 1.2]
  // Back sphere
];
const sphereColors = [
  [1, 0.3, 0.3],
  // Red
  [0.3, 1, 0.3],
  // Green
  [0.3, 0.3, 1],
  // Blue
  [1, 1, 0.3],
  // Yellow
  [1, 0.3, 1],
  // Magenta
  [0.3, 1, 1],
  // Cyan
  [1, 0.7, 0.3],
  // Orange
  [0.7, 0.3, 1]
  // Purple
];
const boxData = [
  [2, 0, -1, 0.8],
  // Right box
  [-2, 0, 1, 0.6],
  // Left box
  [0, -2, -2, 0.7]
  // Bottom box
];
const boxColors = [
  [0.8, 0.8, 0.2],
  // Yellow-green
  [0.2, 0.8, 0.8],
  // Cyan
  [0.8, 0.2, 0.8]
  // Magenta
];
let SHAPE_COUNTER = 0;
const controller = new AbortController();
const canvas = dom("canvas", { parentElement: document.body });
const gl = canvas.getContext("webgl2");
const NUM_SPHERES = 8;
const NUM_BOXES = 3;
const SHAPE_SPHERE = Symbol("SHAPE_SPHERE");
const sphereModule = glsl`
#define NUM_SPHERES ${NUM_SPHERES}
#define ${SHAPE_SPHERE} ${SHAPE_COUNTER++}

struct Sphere {
	vec3 position;
	float radius;
	vec3 color;
};

${uniform.vec4("sphereData", { size: NUM_SPHERES })}
${uniform.vec3("sphereColors", { size: NUM_SPHERES })}

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

// Find closest sphere intersection, returns distance and sets hitIndex and hitType
float findClosestSphere(in vec3 rayOrigin, in vec3 rayDirection, in float maxDistance, out int hitIndex, out int hitType)
{
	float closestDistance = maxDistance;
	hitIndex = -1;
	hitType = -1;
	
	for(int i = 0; i < NUM_SPHERES; i++) {
		Sphere sphere = Sphere(sphereData[i].xyz, sphereData[i].w, sphereColors[i]);
		float distance = sphereIntersection(rayOrigin, rayDirection, sphere);
		
		if(distance > 0.0 && distance < closestDistance) {
			closestDistance = distance;
			hitIndex = i;
			hitType = ${SHAPE_SPHERE};
		}
	}
	
	return hitIndex >= 0 ? closestDistance : -1.0;
}

// Calculate sphere normal and color at hit point
void calculateSphereHit(in vec3 hitPosition, in int hitIndex, out vec3 normal, out vec3 color)
{
	Sphere hitSphere = Sphere(sphereData[hitIndex].xyz, sphereData[hitIndex].w, sphereColors[hitIndex]);
	normal = sphereNormal(hitPosition, hitSphere);
	color = sphereColors[hitIndex];
}`;
const SHAPE_BOX = Symbol("SHAPE_BOX");
const boxModule = glsl`
#define ${SHAPE_BOX} ${SHAPE_COUNTER++}
#define NUM_BOXES ${NUM_BOXES}

struct Box {
	vec3 position;
	float size;
	vec3 color;
};

${uniform.vec4("boxData", { size: NUM_BOXES })}
${uniform.vec3("boxColors", { size: NUM_BOXES })}

float boxIntersection(in vec3 rayOrigin, in vec3 rayDirection, in Box box)
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
vec3 boxNormal(in vec3 hitPosition, in Box box)
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
float findClosestBox(in vec3 rayOrigin, in vec3 rayDirection, in float maxDistance, out int hitIndex, out int hitType)
{
	float closestDistance = maxDistance;
	hitIndex = -1;
	hitType = -1;
	
	for(int i = 0; i < NUM_BOXES; i++) {
		Box box = Box(boxData[i].xyz, boxData[i].w, boxColors[i]);
		float distance = boxIntersection(rayOrigin, rayDirection, box);
		
		if(distance > 0.0 && distance < closestDistance) {
			closestDistance = distance;
			hitIndex = i;
			hitType = ${SHAPE_BOX};
		}
	}
	
	return hitIndex >= 0 ? closestDistance : -1.0;
}

// Calculate box normal and color at hit point
void calculateBoxHit(in vec3 hitPosition, in int hitIndex, out vec3 normal, out vec3 color)
{
	Box hitBox = Box(boxData[hitIndex].xyz, boxData[hitIndex].w, boxColors[hitIndex]);
	normal = boxNormal(hitPosition, hitBox);
	color = boxColors[hitIndex];
}

`;
const fragment = glsl`#version 300 es
precision mediump float;

struct HitInfo {
	bool hit;
	float distance;
	vec3 position;
	vec3 normal;
	vec3 color;
};

${sphereModule}
${boxModule}

${uniform.float("aspectRatio")}

in vec2 v_uv;
out vec4 fragColor;

vec3 lightPos = vec3(5.0, 5.0, 5.0);

vec3 calculateLighting(in vec3 position, in vec3 normal, in vec3 color)
{
	vec3 lightDirection = normalize(lightPos - position);
	float diffuse = max(0.0, dot(normal, lightDirection));
	return color * (diffuse * 0.8 + 0.2); // 80% diffuse + 20% ambient
}

void main()
{	
	// Ray from camera through pixel
	vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
	vec3 rayDirection = normalize(vec3(v_uv.x * aspectRatio, v_uv.y, -1.0));
	
// Find closest intersection across all shapes
float closestDistance = 1000.0;
int hitType = -1;
int hitIndex = -1;

// Check spheres
int sphereIndex, sphereType;
float sphereDistance = findClosestSphere(rayOrigin, rayDirection, closestDistance, sphereIndex, sphereType);
if(sphereDistance > 0.0) {
  closestDistance = sphereDistance;
  hitType = sphereType;
  hitIndex = sphereIndex;
}

// Check boxes
int boxIndex, boxType;
float boxDistance = findClosestBox(rayOrigin, rayDirection, closestDistance, boxIndex, boxType);
if(boxDistance > 0.0) {
  closestDistance = boxDistance;
  hitType = boxType;
  hitIndex = boxIndex;
}

vec3 color = vec3(0.1, 0.1, 0.2); // Background color

// Calculate normal and lighting only for the closest hit
if(hitType >= 0) {
  vec3 hitPosition = rayOrigin + closestDistance * rayDirection;
  vec3 normal;
  vec3 hitColor;
  
  switch(hitType) {
    case ${SHAPE_SPHERE}:
      calculateSphereHit(hitPosition, hitIndex, normal, hitColor);
      color = calculateLighting(hitPosition, normal, hitColor);
      break;
    case ${SHAPE_BOX}:
      calculateBoxHit(hitPosition, hitIndex, normal, hitColor);
      color = calculateLighting(hitPosition, normal, hitColor);
      break;
  }
}
	
	// Gamma correction
	color = pow(color, vec3(1.0 / 2.2));
	
	fragColor = vec4(color, 1.0);
}`;
const { program, view } = compile.toQuad(gl, fragment);
gl.useProgram(program);
view.attributes.a_quad.bind();
const spheresArray = new Float32Array(
  function* () {
    for (const sphere of sphereData) {
      yield sphere[0];
      yield sphere[1];
      yield sphere[2];
      yield sphere[3];
    }
  }()
);
const sphereColorsArray = new Float32Array(
  function* () {
    for (const color of sphereColors) {
      yield color[0];
      yield color[1];
      yield color[2];
    }
  }()
);
const boxesArray = new Float32Array(
  function* () {
    for (const box of boxData) {
      yield box[0];
      yield box[1];
      yield box[2];
      yield box[3];
    }
  }()
);
const boxColorsArray = new Float32Array(
  function* () {
    for (const color of boxColors) {
      yield color[0];
      yield color[1];
      yield color[2];
    }
  }()
);
view.uniforms.sphereData.set(spheresArray);
view.uniforms.sphereColors.set(sphereColorsArray);
view.uniforms.boxData.set(boxesArray);
view.uniforms.boxColors.set(boxColorsArray);
view.uniforms.aspectRatio.set(canvas.width / canvas.height);
function animate(timestamp) {
  const time = timestamp / 1e3;
  const pulseFactor = 0.8 + 0.4 * Math.sin(time * 2);
  spheresArray[3] = pulseFactor;
  const orbitRadius = 2.5;
  spheresArray[4] = Math.cos(time * 0.8) * orbitRadius;
  spheresArray[5] = Math.sin(time * 1.2) * 1.5;
  spheresArray[6] = Math.sin(time * 0.8) * orbitRadius;
  spheresArray[8] = Math.cos(time * 0.6 + Math.PI) * orbitRadius;
  spheresArray[9] = Math.cos(time * 0.9) * 1.2;
  spheresArray[10] = Math.sin(time * 0.6 + Math.PI) * orbitRadius;
  spheresArray[13] = 1 + Math.sin(time * 1.5) * 2;
  spheresArray[16] = Math.sin(time * 0.7) * 2.5;
  spheresArray[17] = Math.sin(time * 1.4) * 1.5;
  spheresArray[18] = -2 + Math.cos(time * 0.7);
  spheresArray[20] = Math.cos(time) * 3.5;
  spheresArray[22] = Math.sin(time) * 3.5;
  spheresArray[23] = 0.4 + 0.2 * Math.sin(time * 3);
  spheresArray[24] = -4 + Math.sin(time * 0.8) * 1.5;
  spheresArray[25] = 2 + Math.sin(time * 1.2) * 1;
  spheresArray[28] = Math.cos(time * 0.5) * 2;
  spheresArray[29] = -1 + Math.sin(time * 0.5) * 0.5;
  sphereColorsArray[0] = 0.5 + 0.5 * Math.sin(time * 3);
  sphereColorsArray[4] = 0.5 + 0.5 * Math.cos(time * 2);
  sphereColorsArray[9] = 0.5 + 0.5 * Math.sin(time * 2.5);
  sphereColorsArray[15] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8));
  sphereColorsArray[16] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8));
  sphereColorsArray[17] = 0.3 + 0.7 * Math.abs(Math.sin(time * 1.8));
  boxesArray[0] = 2 + Math.cos(time * 0.7) * 0.5;
  boxesArray[2] = -1 + Math.sin(time * 0.7) * 0.5;
  boxesArray[7] = 0.6 + 0.3 * Math.sin(time * 2);
  view.uniforms.sphereData?.set(spheresArray);
  view.uniforms.sphereColors?.set(sphereColorsArray);
  view.uniforms.boxData?.set(boxesArray);
  view.uniforms.boxColors?.set(boxColorsArray);
}
function draw(timestamp) {
  if (controller.signal.aborted) return;
  animate(timestamp);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
new ResizeObserver(() => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  view.uniforms.aspectRatio.set(canvas.width / canvas.height);
  draw(performance.now());
}).observe(document.body);
