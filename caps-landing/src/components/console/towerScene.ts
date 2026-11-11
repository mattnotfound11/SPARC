import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import gsap from "gsap";
import type { FloorConfig, Slot, SlotStatus, VehicleClass } from "@/lib/sparc/types";

/*
 * Mechanical (rotary) parking towers. Each tower is a lattice mast with car pallets
 * hanging off its front and back faces, one pair per level. Level N is "Floor N" in
 * the rest of the console, and slot index i on a floor sits on tower floor((i-1)/2),
 * front face for odd i, back face for even i.
 */

export type ParkingTarget = { kind: "floor"; floor: number } | { kind: "slot"; code: string };

export type ParkingSceneEvents = {
  onHover: (target: ParkingTarget | null, x: number, y: number) => void;
  onSelectFloor: (floor: number) => void;
  onSelectSlot: (code: string | null) => void;
};

export type ParkingScene = {
  setData: (config: FloorConfig[], slots: Slot[]) => void;
  setFloor: (floor: number | null) => void;
  setSelected: (code: string | null) => void;
  highlight: (code: string | null) => void;
  highlightFloor: (floor: number | null) => void;
  zoom: (factor: number) => void;
  resetView: () => void;
  dispose: () => void;
};

// Metres.
const PALLET_W = 2.3; // across the car (x)
const PALLET_L = 5.3; // along the car (z)
const MAST_HALF = 0.75; // half depth of the lattice mast (z)
const ARM = 0.35; // gap between the mast and a pallet
const PITCH = 3.5; // tower spacing along x
const LEVEL = 2.45; // height between pallet levels
const BASE_Y = 1.1; // level 1 pallet height above the apron
const COLUMN_X = PALLET_W / 2 + 0.24; // side columns sit just outside the pallet
const PALLET_Z = MAST_HALF + ARM + PALLET_L / 2; // pallet centre from the mast axis
const OUTER_Z = PALLET_Z + PALLET_L / 2;

const STEEL = "#a9c6e4";
const PALLET_BLUE = "#2f78d0";
const LAMP: Record<SlotStatus, string> = { free: "#22c55e", occupied: "#5d6270" };
const LABEL: Record<SlotStatus, { pill: string; text: string }> = {
  free: { pill: "#22c55e", text: "#06230f" },
  occupied: { pill: "#c9ccd4", text: "#14161c" },
};
const CAR_COLORS = ["#d9dde3", "#aab1bb", "#565c68", "#2b2f38", "#8e1f33", "#2f5288", "#e8e4da"];

const levelY = (floor: number) => BASE_Y + (floor - 1) * LEVEL;

type Fadeable = { material: THREE.Material & { opacity: number }; base: number };

type Level = {
  floor: number;
  vehicle: VehicleClass;
  y: number;
  group: THREE.Group;
  pallets: THREE.InstancedMesh;
  lamps: THREE.InstancedMesh;
  cars: THREE.InstancedMesh;
  palletCodes: string[];
  carCodes: string[];
  slots: Map<string, Slot>;
  band: THREE.Group;
  hit: THREE.Mesh;
  labels: THREE.Group;
  name: THREE.Sprite;
  fade: Fadeable[];
  anim: { lift: number; fade: number };
  key: string;
};

/* ── Geometry ─────────────────────────────────────────────── */

function bar(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/** A strut from (y0, z0) to (y1, z1) in the plane x = const. */
function strutYZ(x: number, y0: number, z0: number, y1: number, z1: number, t = 0.06) {
  const len = Math.hypot(y1 - y0, z1 - z0);
  const g = new THREE.BoxGeometry(t, len, t);
  g.rotateX(Math.atan2(z1 - z0, y1 - y0));
  g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

function towerFrame(towers: number, levels: number, originX: number) {
  const parts: THREE.BufferGeometry[] = [];
  const top = levelY(levels) + LEVEL;
  for (let t = 0; t < towers; t++) {
    const cx = originX + t * PITCH;
    for (const side of [-1, 1]) {
      const x = cx + side * COLUMN_X;
      // two rails per column, front and back of the mast
      parts.push(bar(0.15, top, 0.15, x, top / 2, MAST_HALF), bar(0.15, top, 0.15, x, top / 2, -MAST_HALF));
      // ties and X braces, one bay per level
      for (let k = 0; k <= levels; k++) {
        const y = BASE_Y - 0.25 + k * LEVEL;
        parts.push(bar(0.1, 0.1, MAST_HALF * 2, x, y, 0));
        if (k < levels) {
          parts.push(strutYZ(x, y, -MAST_HALF, y + LEVEL, MAST_HALF), strutYZ(x, y, MAST_HALF, y + LEVEL, -MAST_HALF));
        }
      }
      // the lower run from the apron to the first tie
      parts.push(strutYZ(x, 0.2, -MAST_HALF, BASE_Y - 0.25, MAST_HALF));
      // crown: the top sprocket's arch
      const crown = new THREE.TorusGeometry(MAST_HALF, 0.08, 6, 18, Math.PI);
      crown.rotateY(Math.PI / 2);
      crown.translate(x, top, 0);
      parts.push(crown);
    }
    // cross beams tie the two columns together
    for (let k = 0; k <= levels; k++) {
      const y = BASE_Y - 0.25 + k * LEVEL;
      parts.push(bar(COLUMN_X * 2, 0.1, 0.1, cx, y, MAST_HALF), bar(COLUMN_X * 2, 0.1, 0.1, cx, y, -MAST_HALF));
    }
    parts.push(bar(COLUMN_X * 2 + 0.2, 0.18, 0.18, cx, top + MAST_HALF, 0));
    const hub = new THREE.CylinderGeometry(0.32, 0.32, COLUMN_X * 2 - 0.1, 14);
    hub.rotateZ(Math.PI / 2);
    hub.translate(cx, top, 0);
    parts.push(hub);
    // plinth
    parts.push(bar(COLUMN_X * 2 + 0.5, 0.3, MAST_HALF * 2 + 0.5, cx, 0.15, 0));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** One pallet with its hanger. Local +z is the outer end; the inner end faces the mast. */
function palletGeometry() {
  const L = PALLET_L;
  const W = PALLET_W;
  const hang = 1.95;
  const parts = [
    bar(W, 0.1, L, 0, 0.05, 0), // deck
    bar(0.1, 0.18, L, W / 2 - 0.05, 0.14, 0), // side lips
    bar(0.1, 0.18, L, -W / 2 + 0.05, 0.14, 0),
    bar(W, 0.2, 0.1, 0, 0.15, L / 2 - 0.05), // outer wheel stop
    bar(0.08, hang, 0.08, W / 2 + 0.04, hang / 2, -L / 2 + 0.05), // hanger posts at the mast end
    bar(0.08, hang, 0.08, -W / 2 - 0.04, hang / 2, -L / 2 + 0.05),
    bar(W + 0.16, 0.1, 0.1, 0, hang, -L / 2 + 0.05), // hanger top
    bar(0.08, 0.08, ARM + 0.1, W / 2 + 0.04, hang, -L / 2 - ARM / 2), // arms back to the mast
    bar(0.08, 0.08, ARM + 0.1, -W / 2 - 0.04, hang, -L / 2 - ARM / 2),
    strutYZ(W / 2 + 0.04, hang, -L / 2 + 0.05, 0.2, L / 2 - 0.1, 0.05), // tie rods to the outer end
    strutYZ(-W / 2 - 0.04, hang, -L / 2 + 0.05, 0.2, L / 2 - 0.1, 0.05),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function carGeometry(vehicle: VehicleClass) {
  const suv = vehicle === "heavy";
  const L = suv ? 4.75 : 4.4;
  const W = suv ? 1.95 : 1.8;
  const beltline = suv ? 1.12 : 0.92;
  const roof = suv ? 1.78 : 1.42;

  const body = new THREE.Shape();
  body.moveTo(-L / 2, 0.34);
  body.lineTo(-L / 2, beltline - 0.12);
  body.lineTo(-L / 2 + 0.25, beltline);
  body.lineTo(L / 2 - 0.9, beltline);
  body.lineTo(L / 2 - 0.15, beltline - 0.2);
  body.lineTo(L / 2, beltline - 0.38);
  body.lineTo(L / 2, 0.34);
  body.closePath();

  const cabin = new THREE.Shape();
  cabin.moveTo(-L / 2 + 0.35, beltline - 0.02);
  cabin.lineTo(-L / 2 + (suv ? 0.45 : 0.85), roof);
  cabin.lineTo(L / 2 - (suv ? 1.6 : 1.95), roof);
  cabin.lineTo(L / 2 - 1.05, beltline - 0.02);
  cabin.closePath();

  const bodyDepth = W - 0.1;
  const bodyGeo = new THREE.ExtrudeGeometry(body, { depth: bodyDepth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  bodyGeo.translate(0, 0, -bodyDepth / 2);
  const cabinDepth = W - 0.26;
  const cabinGeo = new THREE.ExtrudeGeometry(cabin, { depth: cabinDepth, bevelEnabled: false });
  cabinGeo.translate(0, 0, -cabinDepth / 2);
  const roofGeo = new THREE.BoxGeometry(L - (suv ? 2.05 : 2.8), 0.07, cabinDepth - 0.08);
  roofGeo.translate(suv ? -0.58 : -0.55, roof + 0.02, 0);

  const parts: { geometry: THREE.BufferGeometry; shade: number }[] = [
    { geometry: bodyGeo, shade: 1 },
    { geometry: cabinGeo, shade: 0.06 },
    { geometry: roofGeo, shade: 1 },
  ];
  for (const x of [-(L / 2 - 0.85), L / 2 - 0.85]) {
    for (const z of [-(W / 2 - 0.12), W / 2 - 0.12]) {
      const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
      wheel.rotateX(Math.PI / 2);
      wheel.translate(x, 0.34, z);
      parts.push({ geometry: wheel, shade: 0.03 });
    }
  }
  const merged = mergeGeometries(
    parts.map(({ geometry, shade }) => {
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      flat.deleteAttribute("uv");
      flat.setAttribute("color", new THREE.BufferAttribute(new Float32Array(flat.attributes.position.count * 3).fill(shade), 3));
      return flat;
    }),
  );
  parts.forEach(({ geometry }) => geometry.dispose());
  // nose toward the outer end of the pallet
  merged.rotateY(-Math.PI / 2);
  return merged;
}

function ringGeometry() {
  const w = PALLET_W / 2 + 0.12;
  const d = PALLET_L / 2 + 0.12;
  const t = 0.16;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -d);
  shape.lineTo(w, -d);
  shape.lineTo(w, d);
  shape.lineTo(-w, d);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w + t, -d + t);
  hole.lineTo(-w + t, d - t);
  hole.lineTo(w - t, d - t);
  hole.lineTo(w - t, -d + t);
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

function hashColor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return CAR_COLORS[h % CAR_COLORS.length];
}

/* ── Scene ────────────────────────────────────────────────── */

export function createParkingScene(host: HTMLElement, events: ParkingSceneEvents): ParkingScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.appendChild(canvas);

  const fontFamily = getComputedStyle(host).fontFamily || "sans-serif";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b0e15");
  scene.fog = new THREE.Fog("#0b0e15", 90, 220);
  const camera = new THREE.PerspectiveCamera(30, 2, 1, 900);

  scene.add(new THREE.HemisphereLight("#e4ebff", "#262a33", 1.8));
  const sun = new THREE.DirectionalLight("#fff3e0", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  // Wheel zoom stays off so the dashboard keeps scrolling; the stage has zoom buttons instead.
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.45;
  canvas.style.touchAction = "pan-y";

  const palletGeo = palletGeometry();
  const lampGeo = bar(0.9, 0.09, 0.09, 0, 0.3, PALLET_L / 2 - 0.05);
  const carGeos: Record<VehicleClass, THREE.BufferGeometry> = { light: carGeometry("light"), heavy: carGeometry("heavy") };
  const ring = ringGeometry();
  const hoverRing = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 }));
  const selectRing = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: "#ffc424" }));
  hoverRing.visible = selectRing.visible = false;
  scene.add(hoverRing, selectRing);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.35, roughness: 0.5, transparent: true });
  const bandMaterial = new THREE.MeshBasicMaterial({ color: "#f5b301" });
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Object3D();
  const color = new THREE.Color();

  let levels: Level[] = [];
  let frame: THREE.Mesh | null = null;
  let site: THREE.Group | null = null;
  const frameAnim = { grow: 1, fade: 1 };
  let towers = 1;
  let originX = 0;
  let structureKey = "";
  let view: number | null = null;
  let fittedDistance = 1;
  let selectedCode: string | null = null;
  let hovered: ParkingTarget | null = null;
  let introPlayed = false;
  let timeline: gsap.core.Timeline | null = null;
  let disposed = false;

  let frameId = 0;
  let awakeUntil = 0;
  let dragging = false;

  function loop() {
    frameId = 0;
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
    if (dragging || performance.now() < awakeUntil) frameId = requestAnimationFrame(loop);
  }
  function wake(ms = 0) {
    awakeUntil = Math.max(awakeUntil, performance.now() + ms);
    if (!frameId) frameId = requestAnimationFrame(loop);
  }

  function place(slot: Slot) {
    const i = slot.index - 1;
    const tower = Math.floor(i / 2);
    const side = i % 2 === 0 ? 1 : -1;
    return { x: originX + tower * PITCH, z: side * PALLET_Z, rotY: side > 0 ? 0 : Math.PI };
  }

  function width() {
    return (towers - 1) * PITCH + COLUMN_X * 2;
  }

  function topY() {
    return levelY(levels.length || 5) + LEVEL + MAST_HALF;
  }

  function fadeable(list: Fadeable[], material: THREE.Material & { opacity: number }) {
    material.transparent = true;
    list.push({ material, base: material.opacity });
    return material;
  }

  function labelTexture(text: string, paint: { pill: string; text: string }, w = 160, h = 72) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = paint.pill;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, (h - 8) / 2);
    ctx.fill();
    ctx.fillStyle = paint.text;
    ctx.font = `700 ${Math.round(h * 0.46)}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function disposeSprites(group: THREE.Group) {
    for (const child of [...group.children]) {
      const sprite = child as THREE.Sprite;
      sprite.material.map?.dispose();
      sprite.material.dispose();
      group.remove(sprite);
    }
  }

  function buildSite(span: number) {
    const group = new THREE.Group();
    const add = (mesh: THREE.Mesh, shadow = true) => {
      mesh.receiveShadow = true;
      mesh.castShadow = shadow;
      group.add(mesh);
      return mesh;
    };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#12151c", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    add(ground, false);
    const padW = span + 8;
    const padD = OUTER_Z * 2 + 4;
    add(new THREE.Mesh(new THREE.BoxGeometry(padW, 0.12, padD), new THREE.MeshStandardMaterial({ color: "#2a2e37", roughness: 0.95 }))).position.set(0, 0.06, 0);
    // entry lane in front, with the gold centre line of the brand
    const laneZ = OUTER_Z + 2 + 3;
    add(new THREE.Mesh(new THREE.BoxGeometry(padW, 0.08, 6), new THREE.MeshStandardMaterial({ color: "#1d2028", roughness: 1 })), false).position.set(0, 0.04, laneZ);
    const dash = new THREE.MeshBasicMaterial({ color: "#f5b301" });
    for (let x = -padW / 2 + 1.5; x < padW / 2 - 1; x += 3) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.14), dash), false).position.set(x, 0.09, laneZ);
    }
    // kiosk and barrier at the entry
    const kioskX = -span / 2 - 2.2;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.6), new THREE.MeshStandardMaterial({ color: "#1b1f28", roughness: 0.6 }))).position.set(kioskX, 0.75 + 0.12, OUTER_Z + 1.4);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.05), new THREE.MeshBasicMaterial({ color: "#f5b301" })), false).position.set(kioskX, 1.25 + 0.12, OUTER_Z + 1.73);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), new THREE.MeshStandardMaterial({ color: "#c9ccd4" }))).position.set(kioskX + 1, 0.55 + 0.12, OUTER_Z + 2.2);
    add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: "#e0455e" }))).position.set(kioskX + 3.5, 1.05 + 0.12, OUTER_Z + 2.2);
    return group;
  }

  function buildLevel(config: FloorConfig): Level {
    const group = new THREE.Group();
    const y = levelY(config.floor);
    const fade: Fadeable[] = [];
    const count = Math.max(1, config.slots);

    const pallets = new THREE.InstancedMesh(palletGeo, fadeable(fade, new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.3, roughness: 0.55 })), count);
    const lamps = new THREE.InstancedMesh(lampGeo, fadeable(fade, new THREE.MeshBasicMaterial({ color: "#ffffff" })), count);
    const cars = new THREE.InstancedMesh(carGeos[config.vehicle], fadeable(fade, new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, metalness: 0.4, roughness: 0.42 })), count);
    for (const mesh of [pallets, cars]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    pallets.count = lamps.count = cars.count = 0;
    group.add(pallets, lamps, cars);

    const span = width();
    const band = new THREE.Group();
    for (const z of [OUTER_Z + 0.12, -OUTER_Z - 0.12]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(span + 1, 0.08, 0.08), bandMaterial);
      strip.position.set(0, y + 0.1, z);
      band.add(strip);
    }
    band.visible = false;
    group.add(band);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(span + 1, LEVEL - 0.1, OUTER_Z * 2), hitMaterial);
    hit.position.set(0, y + LEVEL / 2 - 0.15, 0);
    hit.userData.floor = config.floor;
    group.add(hit);

    const labels = new THREE.Group();
    labels.visible = false;
    group.add(labels);

    const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(`Floor ${config.floor}`, { pill: "#141823", text: "#f5f6f8" }, 240, 72), transparent: true, depthWrite: false }));
    name.scale.set(3.2, 0.96, 1);
    name.position.set(-span / 2 - 2, y + 0.9, MAST_HALF + 0.4);
    fadeable(fade, name.material);
    group.add(name);

    scene.add(group);
    return {
      floor: config.floor,
      vehicle: config.vehicle,
      y,
      group,
      pallets,
      lamps,
      cars,
      palletCodes: [],
      carCodes: [],
      slots: new Map(),
      band,
      hit,
      labels,
      name,
      fade,
      anim: { lift: 0, fade: 1 },
      key: "",
    };
  }

  function fill(level: Level, mine: Slot[]) {
    const sorted = [...mine].sort((a, b) => a.index - b.index);
    level.slots = new Map(sorted.map((s) => [s.code, s]));
    level.palletCodes = [];
    level.carCodes = [];
    disposeSprites(level.labels);
    let p = 0;
    let c = 0;
    for (const slot of sorted) {
      const { x, z, rotY } = place(slot);
      tmp.position.set(x, level.y, z);
      tmp.rotation.set(0, rotY, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      level.pallets.setMatrixAt(p, tmp.matrix);
      level.pallets.setColorAt(p, color.set(PALLET_BLUE));
      level.lamps.setMatrixAt(p, tmp.matrix);
      level.lamps.setColorAt(p, color.set(LAMP[slot.status]));
      level.palletCodes.push(slot.code);
      p++;

      if (slot.status === "occupied") {
        tmp.position.set(x, level.y + 0.1, z + (rotY ? -0.1 : 0.1));
        tmp.updateMatrix();
        level.cars.setMatrixAt(c, tmp.matrix);
        level.cars.setColorAt(c, color.set(hashColor(slot.code)));
        level.carCodes.push(slot.code);
        c++;
      }

      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(slot.code, LABEL[slot.status]), transparent: true, depthTest: false }));
      label.scale.set(1.5, 0.68, 1);
      label.position.set(x, level.y + (level.vehicle === "heavy" ? 2.35 : 2.05), z + (rotY ? -1.4 : 1.4));
      label.renderOrder = 2;
      level.labels.add(label);
    }
    level.pallets.count = level.lamps.count = p;
    level.cars.count = c;
    for (const mesh of [level.pallets, level.lamps, level.cars]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
  }

  function clearStructure() {
    for (const level of levels) {
      disposeSprites(level.labels);
      level.name.material.map?.dispose();
      level.name.material.dispose();
      for (const mesh of [level.pallets, level.lamps, level.cars]) (mesh.material as THREE.Material).dispose();
      level.band.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
      level.hit.geometry.dispose();
      scene.remove(level.group);
    }
    levels = [];
    if (frame) {
      frame.geometry.dispose();
      scene.remove(frame);
      frame = null;
    }
    if (site) {
      site.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      scene.remove(site);
      site = null;
    }
  }

  function buildStructure(config: FloorConfig[]) {
    clearStructure();
    towers = Math.max(1, ...config.map((f) => Math.ceil(f.slots / 2)));
    originX = -((towers - 1) * PITCH) / 2;
    const span = width();

    frame = new THREE.Mesh(towerFrame(towers, config.length, originX), frameMaterial);
    frame.castShadow = true;
    frame.receiveShadow = true;
    scene.add(frame);
    site = buildSite(span);
    scene.add(site);
    levels = config.map(buildLevel);

    const reach = Math.max(span, OUTER_Z * 2) / 2 + 10;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 160 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(span * 0.35, 42, 30);
  }

  function applyAnim() {
    if (frame) {
      frame.scale.y = Math.max(0.001, frameAnim.grow);
      frameMaterial.opacity = frameAnim.fade;
      frameMaterial.depthWrite = frameAnim.fade > 0.6;
    }
    for (const level of levels) {
      level.group.position.y = level.anim.lift;
      for (const { material, base } of level.fade) {
        material.opacity = base * level.anim.fade;
        material.depthWrite = level.anim.fade > 0.6 && !(material instanceof THREE.SpriteMaterial);
      }
      level.group.visible = level.anim.fade > 0.01;
    }
    placeRing(selectRing, selectedCode);
    if (hovered?.kind === "slot") placeRing(hoverRing, hovered.code);
  }

  function targetsFor(floor: number | null) {
    return levels.map((level) => {
      if (floor === null || level.floor === floor) return { lift: 0, fade: 1 };
      return level.floor > floor ? { lift: 1.6, fade: 0.1 } : { lift: 0, fade: 0.14 };
    });
  }

  function cameraFor(floor: number | null) {
    const span = width();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (floor === null && camera.aspect < 1) {
      // Portrait: look down the row from its end so the towers recede in depth and fill the height.
      const h = topY() + 2;
      const target = new THREE.Vector3(0, h * 0.45, 0);
      const fitH = h / 2 / tan;
      const fitW = (OUTER_Z * 2 + span * 0.3) / 2 / (tan * camera.aspect);
      const distance = Math.max(fitH, fitW) * 1.05;
      const dir = new THREE.Vector3(1, 0.32, 0.62).normalize();
      return { position: target.clone().addScaledVector(dir, distance), target, distance };
    }
    if (floor === null) {
      const h = topY() + 2;
      // nudge right so the model clears the floor buttons on the stage's right edge
      const target = new THREE.Vector3(span * 0.07, h * 0.46, 0);
      const fitH = h / 2 / tan;
      const fitW = (span + 10) / 2 / (tan * camera.aspect);
      const distance = Math.max(fitH, fitW) * 1.1;
      const dir = new THREE.Vector3(0.36, 0.26, 1).normalize();
      return { position: target.clone().addScaledVector(dir, distance), target, distance };
    }
    const y = levelY(floor);
    const target = new THREE.Vector3(span * 0.06, y + 1, PALLET_Z * 0.45);
    const fitH = 7 / 2 / tan;
    const fitW = (span + 4) / 2 / (tan * camera.aspect);
    const distance = Math.max(fitH, fitW) * 1.05;
    const dir = new THREE.Vector3(0.18, 0.38, 1).normalize();
    return { position: target.clone().addScaledVector(dir, distance), target, distance };
  }

  function placeRing(mesh: THREE.Mesh, code: string | null) {
    const level = levels.find((l) => l.floor === view);
    const slot = level && code ? level.slots.get(code) : undefined;
    if (!level || !slot) {
      mesh.visible = false;
      return;
    }
    const { x, z, rotY } = place(slot);
    mesh.position.set(x, level.y + level.anim.lift + 0.22, z);
    mesh.rotation.y = rotY;
    mesh.visible = true;
  }

  function showLabels() {
    for (const level of levels) {
      level.labels.visible = view === level.floor;
      // the stage header already names the open floor
      level.name.visible = view === null;
    }
  }

  function goTo(floor: number | null, animate = true) {
    view = floor;
    clearHover();
    showLabels();
    timeline?.kill();
    const targets = targetsFor(floor);
    const shot = cameraFor(floor);
    fittedDistance = shot.distance;
    const frameFade = floor === null ? 1 : 0.4;

    if (!animate || reducedMotion) {
      levels.forEach((l, i) => Object.assign(l.anim, targets[i]));
      frameAnim.fade = frameFade;
      applyAnim();
      camera.position.copy(shot.position);
      controls.target.copy(shot.target);
      controls.enabled = true;
      wake(120);
      return;
    }

    const duration = 1.1;
    controls.enabled = false;
    timeline = gsap.timeline({
      defaults: { duration, ease: "power3.inOut" },
      onUpdate: applyAnim,
      onComplete: () => {
        controls.enabled = true;
        wake(120);
      },
    });
    levels.forEach((l, i) => timeline!.to(l.anim, { ...targets[i], duration: duration * 0.8 }, floor === null ? 0.15 : 0));
    timeline.to(frameAnim, { fade: frameFade, duration: duration * 0.8 }, 0);
    timeline.to(camera.position, { x: shot.position.x, y: shot.position.y, z: shot.position.z }, 0);
    timeline.to(controls.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z }, 0);
    wake(duration * 1000 + 300);
  }

  // Towers rise, then each level of pallets swings in from above.
  function playIntro() {
    if (reducedMotion) return;
    timeline?.kill();
    controls.enabled = false;
    frameAnim.grow = 0.001;
    levels.forEach((l) => Object.assign(l.anim, { lift: 6, fade: 0 }));
    applyAnim();
    timeline = gsap.timeline({
      onUpdate: applyAnim,
      onComplete: () => {
        controls.enabled = true;
        wake(120);
      },
    });
    timeline.to(frameAnim, { grow: 1, duration: 0.9, ease: "power3.out" }, 0);
    levels.forEach((l, i) => timeline!.to(l.anim, { lift: 0, fade: 1, duration: 0.7, ease: "power3.out" }, 0.45 + i * 0.1));
    wake(0.45 * 1000 + levels.length * 100 + 900);
  }

  function setData(config: FloorConfig[], slots: Slot[]) {
    const sorted = [...config].sort((a, b) => a.floor - b.floor);
    const shape = sorted.map((f) => `${f.floor}:${f.slots}:${f.vehicle}`).join();
    const rebuilt = shape !== structureKey;
    if (rebuilt) {
      structureKey = shape;
      buildStructure(sorted);
    }
    for (const level of levels) {
      const mine = slots.filter((s) => s.floor === level.floor);
      const key = mine.map((s) => `${s.code}:${s.status}`).join();
      if (key === level.key) continue;
      level.key = key;
      fill(level, mine);
    }
    if (rebuilt) {
      goTo(view, false);
      if (!introPlayed && view === null) {
        introPlayed = true;
        playIntro();
      }
    } else {
      applyAnim();
      showLabels();
    }
    wake(120);
  }

  function pick(clientX: number, clientY: number): ParkingTarget | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (view === null) {
      const hit = raycaster.intersectObjects(levels.map((l) => l.hit), false)[0];
      return hit ? { kind: "floor", floor: hit.object.userData.floor as number } : null;
    }
    const level = levels.find((l) => l.floor === view);
    if (!level) return null;
    const hit = raycaster.intersectObjects([level.cars, level.pallets, level.lamps], false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    const codes = hit.object === level.cars ? level.carCodes : level.palletCodes;
    const code = codes[hit.instanceId];
    return code ? { kind: "slot", code } : null;
  }

  function clearHover() {
    for (const level of levels) level.band.visible = false;
    hoverRing.visible = false;
    hovered = null;
    canvas.style.cursor = "grab";
  }

  function sameTarget(a: ParkingTarget | null, b: ParkingTarget | null) {
    if (!a || !b) return a === b;
    if (a.kind === "floor" && b.kind === "floor") return a.floor === b.floor;
    if (a.kind === "slot" && b.kind === "slot") return a.code === b.code;
    return false;
  }

  function applyHover(target: ParkingTarget | null) {
    if (sameTarget(hovered, target)) return;
    clearHover();
    hovered = target;
    if (target?.kind === "floor") {
      const level = levels.find((l) => l.floor === target.floor);
      if (level) level.band.visible = true;
    }
    if (target?.kind === "slot") placeRing(hoverRing, target.code);
    if (target) canvas.style.cursor = "pointer";
    wake(40);
  }

  let hoverFrameId = 0;
  let lastMove: { x: number; y: number } | null = null;
  let downAt: { x: number; y: number } | null = null;

  function onPointerMove(event: PointerEvent) {
    if (dragging || event.pointerType === "touch" || !controls.enabled) return;
    lastMove = { x: event.clientX, y: event.clientY };
    if (hoverFrameId) return;
    hoverFrameId = requestAnimationFrame(() => {
      hoverFrameId = 0;
      if (!lastMove || disposed) return;
      const target = pick(lastMove.x, lastMove.y);
      applyHover(target);
      const rect = canvas.getBoundingClientRect();
      events.onHover(target, lastMove.x - rect.left, lastMove.y - rect.top);
    });
  }
  function onPointerLeave() {
    lastMove = null;
    applyHover(null);
    events.onHover(null, 0, 0);
  }
  function onPointerDown(event: PointerEvent) {
    downAt = { x: event.clientX, y: event.clientY };
    dragging = true;
    canvas.style.cursor = "grabbing";
    wake();
  }
  function onPointerUp(event: PointerEvent) {
    dragging = false;
    canvas.style.cursor = hovered ? "pointer" : "grab";
    wake(900);
    if (!downAt || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 6 || !controls.enabled) return;
    const target = pick(event.clientX, event.clientY);
    if (view === null) {
      if (target?.kind === "floor") events.onSelectFloor(target.floor);
    } else {
      events.onSelectSlot(target?.kind === "slot" ? target.code : null);
    }
  }
  function onPointerCancel() {
    dragging = false;
    downAt = null;
    wake(300);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.style.cursor = "grab";

  let lastWidth = 0;
  let lastHeight = 0;
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || (w === lastWidth && h === lastHeight)) return;
    lastWidth = w;
    lastHeight = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (levels.length) goTo(view, false);
    wake(120);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    setData,
    setFloor(floor) {
      if (floor !== view) goTo(floor);
    },
    setSelected(code) {
      selectedCode = code;
      placeRing(selectRing, code);
      wake(40);
    },
    highlight(code) {
      applyHover(code ? { kind: "slot", code } : null);
    },
    highlightFloor(floor) {
      if (view === null) applyHover(floor === null ? null : { kind: "floor", floor });
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * factor, fittedDistance * 0.3, fittedDistance * 1.6);
      const next = controls.target.clone().addScaledVector(offset.normalize(), distance);
      gsap.to(camera.position, { x: next.x, y: next.y, z: next.z, duration: reducedMotion ? 0 : 0.4, ease: "power2.out" });
      wake(reducedMotion ? 120 : 520);
    },
    resetView() {
      goTo(view);
    },
    dispose() {
      disposed = true;
      timeline?.kill();
      gsap.killTweensOf(camera.position);
      observer.disconnect();
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(hoverFrameId);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      controls.dispose();
      clearStructure();
      for (const mesh of [hoverRing, selectRing]) (mesh.material as THREE.Material).dispose();
      [palletGeo, lampGeo, ring, carGeos.light, carGeos.heavy].forEach((g) => g.dispose());
      [frameMaterial, bandMaterial, hitMaterial].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
