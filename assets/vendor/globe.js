import * as THREE from "https://esm.sh/three@0.155.0";
import { OrbitControls } from "https://esm.sh/three@0.155.0/examples/jsm/controls/OrbitControls.js";

const RADIUS = 5;
const TARGET_DOTS = 10000;
const DOT_SIZE = 0.02;
const DOT_COLOR = 0xffffff;
const LAND_MAP_URL = "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg";
const SPARK_COLOR = 0xffffff;

const canvas = document.getElementById("globe");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 15);
const globeGeometry = new THREE.SphereGeometry(RADIUS, 64, 64);
const globeMaterial = new THREE.MeshPhongMaterial({
	color: 0x1a73e8, // <-- THIS is the globe color. Change this hex value
	transparent: true,
	opacity: 0.9,
	shininess: 5
});
const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globeMesh);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 1.5 or 2 max
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.setClearColor(0x000000, 0);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const dlight = new THREE.DirectionalLight(0xffffff, 0.35);
dlight.position.set(5, 3, 2);
scene.add(dlight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.rotateSpeed = 1;
controls.autoRotate = true;
controls.autoRotateSpeed = 3;
controls.target.set(0, 0, 0);

// cursor grab
renderer.domElement.style.cursor = "grab";
renderer.domElement.addEventListener("mousedown", () => { renderer.domElement.style.cursor = "grabbing"; });
renderer.domElement.addEventListener("mouseup", () => { renderer.domElement.style.cursor = "grab"; });

function latLonToVector3(lat, lon, r = RADIUS) {
const phi = (90 - lat) * (Math.PI / 180);
const theta = (lon + 180) * (Math.PI / 180);
return new THREE.Vector3(
  -r * Math.sin(phi) * Math.cos(theta),
  r * Math.cos(phi),
  r * Math.sin(phi) * Math.sin(theta)
);
}

// --- land dots ---
const img = new Image();
img.crossOrigin = "anonymous";
img.src = LAND_MAP_URL;
img.onload = () => {
const c = document.createElement("canvas");
c.width = img.width; c.height = img.height;
const ctx = c.getContext("2d");
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, c.width, c.height).data;

function isLand(lat, lon) {
  const u = (lon + 180) / 360;
  const v = 1 - (lat + 90) / 180;
  const x = Math.min(c.width - 1, Math.max(0, Math.floor(u * c.width)));
  const y = Math.min(c.height - 1, Math.max(0, Math.floor(v * c.height)));
  const i = (y * c.width + x) * 4;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return (r > b + 10) && (g > b + 5);
}

const positions = new Float32Array(TARGET_DOTS * 3);
let placed = 0, attempts = 0;
while (placed < TARGET_DOTS && attempts < TARGET_DOTS * 10) {
  attempts++;
  const lon = Math.random() * 360 - 180;
  const u = Math.random() * 2 - 1;
  const lat = Math.asin(u) * 180 / Math.PI;
  if (!isLand(lat, lon)) continue;

  const p = latLonToVector3(lat, lon, RADIUS + 0.001);
  const i3 = placed * 3;
  positions[i3] = p.x; positions[i3+1] = p.y; positions[i3+2] = p.z;
  placed++;
}

const geom = new THREE.BufferGeometry();
geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const mat = new THREE.PointsMaterial({ color: DOT_COLOR, size: DOT_SIZE, sizeAttenuation: false });
scene.add(new THREE.Points(geom, mat));
};

// --- arcs ---
const arcs = [];
function randomLatLon() { return [Math.random() * 180 - 90, Math.random() * 360 - 180]; }

function addArc(lat1, lon1, lat2, lon2) {
	const start = latLonToVector3(lat1, lon1, RADIUS + 0.02);
	const end   = latLonToVector3(lat2, lon2, RADIUS + 0.02);
	// --- Proper lifted midpoint for nice arc ---
	const mid = start.clone().add(end).multiplyScalar(0.5);
	mid.normalize().multiplyScalar(RADIUS * 1.6); // control arc height (1.2 = lower, 2 = taller)
	// Use Quadratic Bezier (start → mid → end)
	const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
	const segments = 128;
	const pts = curve.getPoints(segments);

	const colors = [];
	const h = Math.random();
	const s = 0.8 + Math.random()*0.2; // 0.8–1.0 (very saturated)
	const l1 = 0.7 + Math.random()*0.2; // 0.7–0.9 (bright pastel)
	const l2 = 0.6 + Math.random()*0.2; // 0.6–0.8 (still bright)

	const c1 = new THREE.Color().setHSL(h, s, l1);
	const c2 = new THREE.Color().setHSL(h, s, l2);
	for (let i=0;i<=segments;i++) colors.push(...c1.clone().lerp(c2,i/segments).toArray());

	const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
	lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors,3));
	const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ vertexColors:true }));
	line.geometry.setDrawRange(0, 0);
	scene.add(line);

	const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: SPARK_COLOR }));
	scene.add(spark);

	const startDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
	const endDot   = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
	startDot.position.copy(start); endDot.position.copy(end);
	scene.add(startDot, endDot);

	arcs.push({ curve, spark, line, startDot, endDot, segments, t:0, grow:0, state:"growing" });
}

// --- animation loop ---
let last = performance.now();
let lastArcTime = 0, arcInterval = 500;

function animate(now=performance.now()){
requestAnimationFrame(animate);
const dt = (now-last)/1000; last=now;

// spawn arcs only if tab visible
if (!document.hidden && now - lastArcTime > arcInterval) {
  const [lat1, lon1] = randomLatLon(), [lat2, lon2] = randomLatLon();
  addArc(lat1, lon1, lat2, lon2);
  lastArcTime = now;
}

for (const a of [...arcs]) {
  if (a.state === "growing") {
	a.grow += 100*dt;
	if (a.grow >= a.segments) { a.grow=a.segments; a.state="full"; a.wait=0; }
	a.line.geometry.setDrawRange(0, Math.floor(a.grow));
	a.t = a.grow/a.segments;

	// move spark while growing
	const p = a.curve.getPointAt(a.t);
	a.spark.position.copy(p);

  } else if (a.state==="full") {
	a.wait += dt;
	if (a.wait > 0.5) { a.state="erasing"; a.erase=0; }
	a.t=1;

	// keep spark at end during full state
	const p = a.curve.getPointAt(1);
	a.spark.position.copy(p);

  } else if (a.state==="erasing") {
	a.erase += 100*dt;
	const remain = Math.max(0, a.segments - Math.floor(a.erase));
	a.line.geometry.setDrawRange(a.segments-remain, remain);
	a.t = remain/a.segments;

	// ❌ do NOT move spark here (removes the extra dot effect)

	if (remain<=0) { 
	  scene.remove(a.line,a.spark,a.startDot,a.endDot); 
	  arcs.splice(arcs.indexOf(a),1); 
	  continue; 
	}
  }
}


controls.update();
renderer.render(scene,camera);
}
animate();

// --- resize ---
window.addEventListener("resize", ()=>{
	camera.aspect = canvas.clientWidth/canvas.clientHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
});