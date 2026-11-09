import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import gsap from "gsap";
import type { FloorConfig, Slot, SlotStatus, VehicleClass } from "@/lib/sparc/types";

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

// All dimensions are metres, taken from the reference floor plan.
const BAY_W = 2.6;
const BAY_D = 5.2;
const AISLE = 6;
const POST = 0.6;
const ROW = POST + 3 * BAY_W;
const PER_ROW = 6;
const STOREY = 3.4;
const SLAB = 0.32;
const PARAPET = 1.05;
const MARGIN = 0.5;
const HALF_W = AISLE / 2 + BAY_D + MARGIN;
const WIDTH = HALF_W * 2;
const PLAN_POSTS = 0.16;

const STATUS_PAINT: Record<SlotStatus, { tint: string; pill: string; text: string }> = {
  free: { tint: "rgba(34,197,94,0.24)", pill: "#22c55e", text: "#06230f" },
  reserved: { tint: "rgba(245,179,1,0.3)", pill: "#f5b301", text: "#16110a" },
  occupied: { tint: "rgba(255,255,255,0.05)", pill: "#c9ccd4", text: "#14161c" },
};
const CAR_COLORS = ["#d9dde3", "#aab1bb", "#565c68", "#2b2f38", "#8e1f33", "#2f5288", "#e8e4da"];

type Tracked = { material: THREE.Material; opacity: number; transparent: boolean };

type FloorModel = {
  floor: number;
  base: number;
  group: THREE.Group;
  tall: THREE.Group;
  glow: THREE.MeshStandardMaterial[];
  tracked: Tracked[];
  carMaterial: THREE.MeshStandardMaterial;
  ghostMaterial: THREE.MeshStandardMaterial;
  cars: THREE.InstancedMesh | null;
  ghosts: THREE.InstancedMesh | null;
  carCodes: string[];
  ghostCodes: string[];
  byIndex: Map<number, Slot>;
  key: string;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  scale: number;
  anim: { lift: number; fade: number; tall: number };
  hit: THREE.Mesh;
};

type Extra = { group: THREE.Group; tracked: Tracked[]; anim: { lift: number; fade: number } };

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
  const roofLength = L - (suv ? 2.05 : 2.8);
  const roofGeo = new THREE.BoxGeometry(roofLength, 0.07, cabinDepth - 0.08);
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
      const colors = new Float32Array(flat.attributes.position.count * 3).fill(shade);
      flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return flat;
    }),
  );
  parts.forEach(({ geometry }) => geometry.dispose());
  return merged;
}

function hashColor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return CAR_COLORS[h % CAR_COLORS.length];
}

function frameGeometry() {
  const w = BAY_W / 2 + 0.04;
  const d = BAY_D / 2 + 0.04;
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
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

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
  const camera = new THREE.PerspectiveCamera(30, 2, 1, 900);

  scene.add(new THREE.HemisphereLight("#e4ebff", "#2a2e38", 1.9));
  const sun = new THREE.DirectionalLight("#fff3e0", 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  // Wheel zoom stays off so the dashboard keeps scrolling; the stage has zoom buttons instead.
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.42;
  // OrbitControls sets "none"; pan-y lets a vertical swipe on a phone still scroll the page.
  canvas.style.touchAction = "pan-y";

  const carGeometries: Record<VehicleClass, THREE.BufferGeometry> = { light: carGeometry("light"), heavy: carGeometry("heavy") };
  const frame = frameGeometry();
  const hoverFrame = new THREE.Mesh(frame, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 }));
  const selectFrame = new THREE.Mesh(frame, new THREE.MeshBasicMaterial({ color: "#ffc424" }));
  hoverFrame.visible = false;
  selectFrame.visible = false;
  scene.add(hoverFrame, selectFrame);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const groundPoint = new THREE.Vector3();

  let models: FloorModel[] = [];
  let extras: Extra[] = [];
  let roof: Extra | null = null;
  let site: Extra | null = null;
  let structureKey = "";
  let length = 0;
  let originX = 0;
  let rows = 1;
  let height = 0;
  let view: number | null = null;
  let portrait = false;
  let fittedDistance = 1;
  let selectedCode: string | null = null;
  let hovered: ParkingTarget | null = null;
  let hoveredFloor: FloorModel | null = null;
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

  function bayCenter(index: number) {
    const i = index - 1;
    const row = Math.floor(i / PER_ROW);
    const column = i % PER_ROW;
    const side = column < 3 ? -1 : 1;
    return {
      x: originX + (row + 1) * ROW + POST + ((column % 3) + 0.5) * BAY_W,
      z: side * (AISLE / 2 + BAY_D / 2),
      side,
    };
  }

  function bayAt(x: number, z: number, model: FloorModel) {
    const distance = Math.abs(z);
    if (distance < AISLE / 2 - 1 || distance > AISLE / 2 + BAY_D) return null;
    const along = x - originX;
    const row = Math.floor(along / ROW) - 1;
    if (row < 0) return null;
    const within = along - (row + 1) * ROW - POST;
    if (within < 0) return null;
    const position = Math.floor(within / BAY_W);
    if (position > 2) return null;
    return model.byIndex.get(row * PER_ROW + (z < 0 ? 0 : 3) + position + 1) ?? null;
  }

  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function track<T extends THREE.Material>(list: Tracked[], material: T) {
    list.push({ material, opacity: material.opacity, transparent: material.transparent });
    return material;
  }

  function buildParapets(parent: THREE.Object3D, material: THREE.Material) {
    const t = 0.2;
    box(length, PARAPET, t, 0, PARAPET / 2, HALF_W - t / 2, material, parent);
    box(length, PARAPET, t, 0, PARAPET / 2, -HALF_W + t / 2, material, parent);
    box(t, PARAPET, WIDTH, length / 2 - t / 2, PARAPET / 2, 0, material, parent);
    box(t, PARAPET, WIDTH, -length / 2 + t / 2, PARAPET / 2, 0, material, parent);
  }

  function buildFloor(config: FloorConfig, index: number): FloorModel {
    const group = new THREE.Group();
    const base = index * STOREY;
    group.position.y = base;
    scene.add(group);
    const tracked: Tracked[] = [];

    const concrete = track(tracked, new THREE.MeshStandardMaterial({ color: "#bfc4ce", roughness: 0.88 }));
    const parapet = track(tracked, new THREE.MeshStandardMaterial({ color: "#e4e6ea", roughness: 0.8 }));
    const postMaterial = track(tracked, new THREE.MeshStandardMaterial({ color: "#8d93a0", roughness: 0.85 }));
    const coreMaterial = track(tracked, new THREE.MeshStandardMaterial({ color: "#d4d7dd", roughness: 0.75 }));
    const carMaterial = track(tracked, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.15 }));
    const ghostMaterial = track(tracked, new THREE.MeshStandardMaterial({ color: "#f5b301", transparent: true, opacity: 0.42, roughness: 0.5, depthWrite: false }));
    const deckMaterial = track(tracked, new THREE.MeshStandardMaterial({ roughness: 0.95 }));

    box(length, SLAB, WIDTH, 0, -SLAB / 2, 0, concrete, group);

    const scale = Math.min(56, 4096 / length);
    const paper = document.createElement("canvas");
    paper.width = Math.round(length * scale);
    paper.height = Math.round(WIDTH * scale);
    const ctx = paper.getContext("2d")!;
    const texture = new THREE.CanvasTexture(paper);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    deckMaterial.map = texture;
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(length, WIDTH), deckMaterial);
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0.012;
    deck.receiveShadow = true;
    group.add(deck);

    const tall = new THREE.Group();
    group.add(tall);
    buildParapets(tall, parapet);

    const postHeight = STOREY - SLAB;
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(POST, postHeight, POST), postMaterial, (rows + 2) * 2);
    const matrix = new THREE.Matrix4();
    for (let k = 0; k <= rows + 1; k++) {
      for (const [slot, side] of [-1, 1].entries()) {
        matrix.setPosition(originX + k * ROW + POST / 2, postHeight / 2, side * (AISLE / 2 + BAY_D - POST / 2));
        posts.setMatrixAt(k * 2 + slot, matrix);
      }
    }
    posts.castShadow = true;
    posts.receiveShadow = true;
    tall.add(posts);

    const coreLeft = originX + POST;
    const coreRight = originX + ROW;
    const coreNear = AISLE / 2 + 0.1;
    const coreFar = AISLE / 2 + BAY_D;
    const wall = 0.24;
    const centreX = (coreLeft + coreRight) / 2;
    const centreZ = (coreNear + coreFar) / 2;
    box(coreRight - coreLeft, postHeight, wall, centreX, postHeight / 2, coreFar - wall / 2, coreMaterial, tall);
    box(wall, postHeight, coreFar - coreNear, coreLeft + wall / 2, postHeight / 2, centreZ, coreMaterial, tall);
    box(wall, postHeight, coreFar - coreNear, coreRight - wall / 2, postHeight / 2, centreZ, coreMaterial, tall);
    const doorGap = 1.8;
    const segment = (coreRight - coreLeft - doorGap) / 2;
    box(segment, postHeight, wall, coreLeft + segment / 2, postHeight / 2, coreNear + wall / 2, coreMaterial, tall);
    box(segment, postHeight, wall, coreRight - segment / 2, postHeight / 2, coreNear + wall / 2, coreMaterial, tall);

    if (config.floor === 1) {
      const post = track(tracked, new THREE.MeshStandardMaterial({ color: "#f5b301", roughness: 0.5 }));
      const arm = track(tracked, new THREE.MeshStandardMaterial({ color: "#e0455e", roughness: 0.5 }));
      const gateX = originX + ROW * 0.72;
      box(0.45, 1.1, 0.45, gateX, 0.55, AISLE / 2 - 0.35, post, group);
      box(0.12, 0.12, AISLE - 1.1, gateX, 1.02, 0.2, arm, group);
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(length, STOREY, WIDTH));
    hit.position.y = base + STOREY / 2 - SLAB;
    hit.visible = false;
    hit.userData.floor = config.floor;
    scene.add(hit);

    return {
      floor: config.floor,
      base,
      group,
      tall,
      glow: [concrete, parapet],
      tracked,
      carMaterial,
      ghostMaterial,
      cars: null,
      ghosts: null,
      carCodes: [],
      ghostCodes: [],
      byIndex: new Map(),
      key: "",
      ctx,
      texture,
      scale,
      anim: { lift: 0, fade: 1, tall: 1 },
      hit,
    };
  }

  function buildRoof(total: number): Extra {
    const group = new THREE.Group();
    group.position.y = total * STOREY;
    scene.add(group);
    const tracked: Tracked[] = [];
    const concrete = track(tracked, new THREE.MeshStandardMaterial({ color: "#c7cbd4", roughness: 0.9 }));
    const parapet = track(tracked, new THREE.MeshStandardMaterial({ color: "#e4e6ea", roughness: 0.8 }));
    const cap = track(tracked, new THREE.MeshStandardMaterial({ color: "#f5b301", roughness: 0.55 }));
    box(length, SLAB, WIDTH, 0, -SLAB / 2, 0, concrete, group);
    buildParapets(group, parapet);
    box(ROW - POST, 1.5, BAY_D - 0.1, originX + POST + (ROW - POST) / 2, 0.75, AISLE / 2 + 0.1 + (BAY_D - 0.1) / 2, parapet, group);
    box(ROW - POST + 0.3, 0.12, BAY_D + 0.2, originX + POST + (ROW - POST) / 2, 1.56, AISLE / 2 + 0.1 + (BAY_D - 0.1) / 2, cap, group);
    return { group, tracked, anim: { lift: 0, fade: 1 } };
  }

  function buildSite(): Extra {
    const group = new THREE.Group();
    scene.add(group);
    const tracked: Tracked[] = [];
    const ground = track(tracked, new THREE.MeshStandardMaterial({ color: "#1c212c", roughness: 1 }));
    const pavement = track(tracked, new THREE.MeshStandardMaterial({ color: "#3d4350", roughness: 1 }));
    const road = track(tracked, new THREE.MeshStandardMaterial({ color: "#14171f", roughness: 1 }));
    const trunk = track(tracked, new THREE.MeshStandardMaterial({ color: "#4a3a2d", roughness: 1 }));
    const crown = track(tracked, new THREE.MeshStandardMaterial({ color: "#2f6b4c", roughness: 0.95, flatShading: true }));

    const top = -SLAB;
    const groundW = length + 34;
    const groundD = WIDTH + 30;
    box(groundW, 0.5, groundD, 0, top - 0.3, 0, ground, group).castShadow = false;
    box(length + 7, 0.14, WIDTH + 7, 0, top - 0.02, 0, pavement, group).castShadow = false;
    const roadZ = WIDTH / 2 + 10;
    box(groundW, 0.06, 7, 0, top - 0.03, roadZ, road, group).castShadow = false;
    box(7, 0.06, roadZ, -length / 2 - 3.5, top + 0.06, roadZ / 2, road, group).castShadow = false;

    const crownGeometry = new THREE.IcosahedronGeometry(1.7, 1);
    const count = Math.max(4, Math.floor(length / 11));
    for (let i = 0; i < count; i++) {
      const x = -length / 2 + 6 + (i * (length - 10)) / Math.max(1, count - 1);
      box(0.3, 2.2, 0.3, x, top + 1.1, WIDTH / 2 + 5.4, trunk, group);
      const tree = new THREE.Mesh(crownGeometry, crown);
      tree.position.set(x, top + 3.4, WIDTH / 2 + 5.4);
      tree.castShadow = true;
      group.add(tree);
    }
    return { group, tracked, anim: { lift: 0, fade: 1 } };
  }

  function disposeTree(root: THREE.Object3D) {
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry && !Object.values(carGeometries).includes(mesh.geometry)) mesh.geometry.dispose();
      if (mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.map?.dispose();
        material.dispose();
      }
    });
  }

  function clearStructure() {
    for (const model of models) {
      disposeTree(model.group);
      scene.remove(model.group);
      model.hit.geometry.dispose();
      (model.hit.material as THREE.Material).dispose();
      scene.remove(model.hit);
    }
    for (const extra of extras) {
      disposeTree(extra.group);
      scene.remove(extra.group);
    }
    models = [];
    extras = [];
  }

  function buildStructure(config: FloorConfig[], rowCount: number) {
    clearStructure();
    rows = rowCount;
    length = ROW * (rows + 1) + POST + MARGIN * 2;
    originX = -length / 2 + MARGIN;
    height = config.length * STOREY;
    models = config.map(buildFloor);
    roof = buildRoof(config.length);
    site = buildSite();
    extras = [roof, site];

    const reach = Math.max(length, WIDTH + 30) * 0.8;
    sun.position.set(-length * 0.5, height + 70, 48);
    sun.target.position.set(0, height / 2, 0);
    const shadow = sun.shadow.camera;
    shadow.left = -reach;
    shadow.right = reach;
    shadow.top = reach;
    shadow.bottom = -reach;
    shadow.near = 1;
    shadow.far = 260;
    shadow.updateProjectionMatrix();
  }

  function paint(model: FloorModel) {
    const { ctx, scale } = model;
    const S = scale;
    ctx.setTransform(S, 0, 0, S, (length / 2) * S, (WIDTH / 2) * S);
    ctx.fillStyle = "#292d36";
    ctx.fillRect(-length / 2, -WIDTH / 2, length, WIDTH);
    ctx.fillStyle = "#343944";
    ctx.fillRect(originX, -AISLE / 2, length - MARGIN * 2, AISLE);

    function text(value: string, x: number, z: number, size: number, color: string, pill?: string) {
      ctx.save();
      ctx.translate(x, z);
      ctx.scale(1 / S, 1 / S);
      if (portrait) ctx.rotate(-Math.PI / 2);
      ctx.font = `700 ${size * S}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (pill) {
        const w = ctx.measureText(value).width + size * S * 0.8;
        const h = size * S * 1.5;
        ctx.fillStyle = pill;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, h / 3);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.fillText(value, 0, size * S * 0.04);
      ctx.restore();
    }

    function arrow(points: [number, number][]) {
      ctx.strokeStyle = "#e0455e";
      ctx.fillStyle = "#e0455e";
      ctx.lineWidth = 0.2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      points.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
      ctx.stroke();
      const [ax, az] = points[points.length - 2];
      const [bx, bz] = points[points.length - 1];
      const angle = Math.atan2(bz - az, bx - ax);
      ctx.save();
      ctx.translate(bx, bz);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0.55, 0);
      ctx.lineTo(-0.1, -0.42);
      ctx.lineTo(-0.1, 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let row = 0; row < rows; row++) {
      const x = originX + (row + 1) * ROW + ROW / 2;
      arrow([[x - 1.6, 0.85], [x + 0.9, 0.85]]);
      arrow([[x - 1.2, -0.3], [x + 0.5, -0.3], [x + 0.5, -1.25]]);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 0.1;
    for (const [index, slot] of model.byIndex) {
      const { x, z, side } = bayCenter(index);
      const colors = STATUS_PAINT[slot.status];
      ctx.fillStyle = colors.tint;
      ctx.fillRect(x - BAY_W / 2, z - BAY_D / 2, BAY_W, BAY_D);
      const front = z - (side * BAY_D) / 2;
      const rear = z + (side * BAY_D) / 2;
      ctx.beginPath();
      ctx.moveTo(x - BAY_W / 2, front);
      ctx.lineTo(x - BAY_W / 2, rear);
      ctx.lineTo(x + BAY_W / 2, rear);
      ctx.lineTo(x + BAY_W / 2, front);
      ctx.stroke();
      text(slot.code, x, side * (AISLE / 2 - 0.62), 0.62, colors.text, colors.pill);
    }

    const coreLeft = originX + POST;
    const coreRight = originX + ROW;
    const coreNear = AISLE / 2 + 0.1;
    const coreFar = AISLE / 2 + BAY_D;
    ctx.fillStyle = "#4a505d";
    ctx.fillRect(coreLeft, coreNear, coreRight - coreLeft, coreFar - coreNear);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.05;
    for (let i = 0; i < 12; i++) {
      const x = coreLeft + 0.5 + i * 0.28;
      ctx.beginPath();
      ctx.moveTo(x, coreFar - 3.1);
      ctx.lineTo(x, coreFar - 0.4);
      ctx.stroke();
    }
    const liftX = coreRight - 2.9;
    const liftZ = coreFar - 3;
    ctx.lineWidth = 0.08;
    ctx.strokeRect(liftX, liftZ, 2.4, 2.4);
    ctx.beginPath();
    ctx.moveTo(liftX, liftZ);
    ctx.lineTo(liftX + 2.4, liftZ + 2.4);
    ctx.moveTo(liftX + 2.4, liftZ);
    ctx.lineTo(liftX, liftZ + 2.4);
    ctx.stroke();
    text("Stairs and lift", (coreLeft + coreRight) / 2, coreNear + 1.05, 0.56, "#f5f6f8");

    const rampFar = -AISLE / 2 - BAY_D;
    const isTop = model.floor === models[models.length - 1].floor;
    ctx.save();
    ctx.beginPath();
    ctx.rect(coreLeft, rampFar, coreRight - coreLeft, BAY_D);
    ctx.clip();
    ctx.fillStyle = "#3a3f4a";
    ctx.fillRect(coreLeft, rampFar, coreRight - coreLeft, BAY_D);
    ctx.strokeStyle = "rgba(245,179,1,0.5)";
    ctx.lineWidth = 0.16;
    for (let x = coreLeft - BAY_D; x < coreRight; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x, rampFar + BAY_D);
      ctx.lineTo(x + BAY_D, rampFar);
      ctx.stroke();
    }
    ctx.restore();
    text(isTop ? "Ramp down" : "Ramp up", (coreLeft + coreRight) / 2, rampFar + BAY_D / 2, 0.68, "#f5f6f8", "rgba(8,9,13,0.72)");

    if (model.floor === models[0].floor) text("Entrance", coreLeft + 2.6, 0, 0.62, "#ffd666");
    model.texture.needsUpdate = true;
  }

  function placeCars(model: FloorModel, vehicle: VehicleClass) {
    for (const key of ["cars", "ghosts"] as const) {
      const mesh = model[key];
      if (mesh) {
        model.group.remove(mesh);
        mesh.dispose();
        model[key] = null;
      }
    }
    const parked = [...model.byIndex.entries()].filter(([, s]) => s.status === "occupied");
    const incoming = [...model.byIndex.entries()].filter(([, s]) => s.status === "reserved");
    model.carCodes = parked.map(([, s]) => s.code);
    model.ghostCodes = incoming.map(([, s]) => s.code);

    const up = new THREE.Vector3(0, 1, 0);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const place = (list: [number, Slot][], material: THREE.Material, solid: boolean) => {
      if (!list.length) return null;
      const mesh = new THREE.InstancedMesh(carGeometries[vehicle], material, list.length);
      list.forEach(([index, slot], i) => {
        const { x, z, side } = bayCenter(index);
        rotation.setFromAxisAngle(up, side < 0 ? -Math.PI / 2 : Math.PI / 2);
        matrix.compose(new THREE.Vector3(x, 0.02, z), rotation, one);
        mesh.setMatrixAt(i, matrix);
        if (solid) mesh.setColorAt(i, new THREE.Color(hashColor(slot.code)));
      });
      mesh.castShadow = solid;
      mesh.computeBoundingSphere();
      model.group.add(mesh);
      return mesh;
    };
    model.cars = place(parked, model.carMaterial, true);
    model.ghosts = place(incoming, model.ghostMaterial, false);
  }

  function applyFade(tracked: Tracked[], fade: number) {
    for (const entry of tracked) {
      entry.material.opacity = entry.opacity * fade;
      entry.material.transparent = entry.transparent || fade < 0.995;
    }
  }

  function applyAnim() {
    for (const model of models) {
      const { lift, fade, tall } = model.anim;
      model.group.position.y = model.base + lift;
      model.group.visible = fade > 0.01;
      model.tall.scale.y = tall;
      applyFade(model.tracked, fade);
    }
    for (const extra of extras) {
      extra.group.position.y = (extra === roof ? height : 0) + extra.anim.lift;
      extra.group.visible = extra.anim.fade > 0.01;
      applyFade(extra.tracked, extra.anim.fade);
    }
  }

  function animTargets(floor: number | null) {
    const focus = floor === null ? -1 : models.findIndex((m) => m.floor === floor);
    return {
      focus,
      floors: models.map((_, i) => {
        if (focus < 0) return { lift: 0, fade: 1, tall: 1 };
        if (i === focus) return { lift: 0, fade: 1, tall: PLAN_POSTS };
        if (i > focus) return { lift: 10 + (i - focus) * 5, fade: 0, tall: 1 };
        return { lift: 0, fade: 0, tall: 1 };
      }),
      roof: focus < 0 ? { lift: 0, fade: 1 } : { lift: 30, fade: 0 },
      site: focus < 0 ? { lift: 0, fade: 1 } : { lift: 0, fade: 0 },
    };
  }

  // Width of the floor panel that overlays the right of the stage.
  function railInset() {
    return host.clientWidth >= 640 ? 156 : 76;
  }

  function applyProjection() {
    const width = host.clientWidth;
    const hostHeight = Math.max(1, host.clientHeight);
    camera.aspect = width / hostHeight;
    camera.setViewOffset(width, hostHeight, railInset() / 2, 0, width, hostHeight);
    camera.updateProjectionMatrix();
  }

  function cameraFor(floor: number | null) {
    const model = floor === null ? null : models.find((m) => m.floor === floor);
    const center = model ? new THREE.Vector3(0, model.base, 0) : new THREE.Vector3(0, height / 2 - 1.5, 0);
    const half = model ? new THREE.Vector3(length / 2 + 0.6, 1, WIDTH / 2 + 0.6) : new THREE.Vector3(length / 2 + 4, height / 2 + 1, WIDTH / 2 + 4);
    const direction = (
      model ? (portrait ? new THREE.Vector3(1, 1.65, 0) : new THREE.Vector3(0, 1.65, 1)) : portrait ? new THREE.Vector3(-1, 0.5, 0.72) : new THREE.Vector3(-0.62, 0.42, 1)
    ).normalize();

    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * ((host.clientWidth - railInset()) / Math.max(1, host.clientHeight));
    let distance = 0;
    const corner = new THREE.Vector3();
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          corner.set(sx * half.x, sy * half.y, sz * half.z);
          const depth = corner.dot(direction);
          distance = Math.max(distance, Math.abs(corner.dot(right)) / tanH + depth, Math.abs(corner.dot(up)) / tanV + depth);
        }
      }
    }
    distance *= 1.06;
    return { target: center, position: center.clone().addScaledVector(direction, distance), distance };
  }

  function clearHover() {
    if (hoveredFloor) {
      hoveredFloor.glow.forEach((m) => m.emissive.set("#000000"));
      hoveredFloor = null;
    }
    hoverFrame.visible = false;
    hovered = null;
    canvas.style.cursor = "grab";
  }

  function placeFrame(mesh: THREE.Mesh, code: string | null) {
    const model = models.find((m) => m.floor === view);
    const slot = model && code ? [...model.byIndex.values()].find((s) => s.code === code) : undefined;
    if (!model || !slot) {
      mesh.visible = false;
      return;
    }
    const { x, z } = bayCenter(slot.index);
    mesh.position.set(x, model.base + 0.06, z);
    mesh.visible = true;
  }

  function goTo(floor: number | null, animate = true) {
    view = floor;
    clearHover();
    placeFrame(selectFrame, selectedCode);
    timeline?.kill();
    const targets = animTargets(floor);
    const shot = cameraFor(floor);
    fittedDistance = shot.distance;

    if (!animate || reducedMotion) {
      models.forEach((m, i) => Object.assign(m.anim, targets.floors[i]));
      if (roof) Object.assign(roof.anim, targets.roof);
      if (site) Object.assign(site.anim, targets.site);
      applyAnim();
      camera.position.copy(shot.position);
      controls.target.copy(shot.target);
      controls.enabled = true;
      wake(120);
      return;
    }

    const duration = 1.15;
    controls.enabled = false;
    timeline = gsap.timeline({
      defaults: { duration, ease: "power3.inOut" },
      onUpdate: applyAnim,
      onComplete: () => {
        controls.enabled = true;
        wake(120);
      },
    });
    models.forEach((m, i) => timeline!.to(m.anim, { ...targets.floors[i], duration: duration * 0.8 }, floor === null ? 0.2 : 0));
    if (roof) timeline.to(roof.anim, { ...targets.roof, duration: duration * 0.8 }, floor === null ? 0.2 : 0);
    if (site) timeline.to(site.anim, { ...targets.site, duration: duration * 0.8 }, floor === null ? 0.2 : 0);
    timeline.to(camera.position, { x: shot.position.x, y: shot.position.y, z: shot.position.z }, 0);
    timeline.to(controls.target, { x: shot.target.x, y: shot.target.y, z: shot.target.z }, 0);
    wake(duration * 1000 + 300);
  }

  function playIntro() {
    if (reducedMotion) return;
    timeline?.kill();
    controls.enabled = false;
    models.forEach((m) => {
      m.anim.lift = 7;
      m.anim.fade = 0;
    });
    if (roof) {
      roof.anim.lift = 9;
      roof.anim.fade = 0;
    }
    applyAnim();
    timeline = gsap.timeline({
      defaults: { duration: 0.75, ease: "power3.out" },
      onUpdate: applyAnim,
      onComplete: () => {
        controls.enabled = true;
        wake(120);
      },
    });
    models.forEach((m, i) => timeline!.to(m.anim, { lift: 0, fade: 1 }, i * 0.09));
    if (roof) timeline.to(roof.anim, { lift: 0, fade: 1 }, models.length * 0.09);
    wake(0.75 * 1000 + models.length * 90 + 300);
  }

  function setData(config: FloorConfig[], slots: Slot[]) {
    const sorted = [...config].sort((a, b) => a.floor - b.floor);
    const rowCount = Math.max(1, ...sorted.map((f) => Math.ceil(f.slots / PER_ROW)));
    const shape = `${sorted.map((f) => f.floor).join()}|${rowCount}`;
    const rebuilt = shape !== structureKey;
    if (rebuilt) {
      structureKey = shape;
      buildStructure(sorted, rowCount);
    }
    for (const model of models) {
      const mine = slots.filter((s) => s.floor === model.floor);
      const key = mine.map((s) => `${s.code}:${s.status}:${s.vehicle}`).join();
      if (key === model.key) continue;
      model.key = key;
      model.byIndex = new Map(mine.map((s) => [s.index, s]));
      paint(model);
      placeCars(model, sorted.find((f) => f.floor === model.floor)?.vehicle ?? "light");
    }
    if (rebuilt) {
      goTo(view, false);
      if (!introPlayed && view === null) {
        introPlayed = true;
        playIntro();
      }
    } else {
      placeFrame(selectFrame, selectedCode);
    }
    wake(120);
  }

  function pick(clientX: number, clientY: number): ParkingTarget | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);

    if (view === null) {
      const hit = raycaster.intersectObjects(models.map((m) => m.hit), false)[0];
      return hit ? { kind: "floor", floor: hit.object.userData.floor as number } : null;
    }
    const model = models.find((m) => m.floor === view);
    if (!model) return null;
    const meshes = [model.cars, model.ghosts].filter((m): m is THREE.InstancedMesh => m !== null);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit && hit.instanceId !== undefined) {
      const codes = hit.object === model.cars ? model.carCodes : model.ghostCodes;
      return { kind: "slot", code: codes[hit.instanceId] };
    }
    groundPlane.constant = -model.base;
    if (!raycaster.ray.intersectPlane(groundPlane, groundPoint)) return null;
    const slot = bayAt(groundPoint.x, groundPoint.z, model);
    return slot ? { kind: "slot", code: slot.code } : null;
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
      hoveredFloor = models.find((m) => m.floor === target.floor) ?? null;
      hoveredFloor?.glow.forEach((m) => {
        m.emissive.set("#f5b301");
        m.emissiveIntensity = 0.5;
      });
    }
    if (target?.kind === "slot") placeFrame(hoverFrame, target.code);
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

  let lastWidth = host.clientWidth;
  let lastHeight = host.clientHeight;

  function resize() {
    const width = host.clientWidth;
    const hostHeight = host.clientHeight;
    if (!width || !hostHeight || (width === lastWidth && hostHeight === lastHeight)) return;
    lastWidth = width;
    lastHeight = hostHeight;
    renderer.setSize(width, hostHeight, false);
    applyProjection();
    const nextPortrait = camera.aspect < 1;
    if (nextPortrait !== portrait) {
      portrait = nextPortrait;
      models.forEach(paint);
    }
    if (models.length) goTo(view, false);
    wake(120);
  }
  portrait = host.clientWidth < host.clientHeight;
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  applyProjection();
  renderer.setSize(host.clientWidth, host.clientHeight, false);

  return {
    setData,
    setFloor(floor) {
      if (floor !== view) goTo(floor);
    },
    setSelected(code) {
      selectedCode = code;
      placeFrame(selectFrame, code);
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
      for (const model of [hoverFrame, selectFrame]) (model.material as THREE.Material).dispose();
      frame.dispose();
      Object.values(carGeometries).forEach((g) => g.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
