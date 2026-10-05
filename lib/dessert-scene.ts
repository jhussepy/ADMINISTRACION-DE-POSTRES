import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Matrix3,
  Mesh,
  PerspectiveCamera,
  PCFShadowMap,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type DessertScene = {
  setPaused: (paused: boolean) => void;
  turn: (direction: number) => void;
  reset: () => void;
  dispose: () => void;
};

// Both views share the decoded asset. Release it when the last view unmounts.
let source: Promise<Group> | null = null;
let users = 0;
function disposeAsset(root: Object3D) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (
          value &&
          typeof value === "object" &&
          "isTexture" in value &&
          value.isTexture
        )
          textures.add(value as Texture);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    const bitmap = texture.image;
    if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap)
      bitmap.close();
    texture.dispose();
  });
}
async function applyPhotoMaterials(
  root: Group,
  image: HTMLImageElement | null,
) {
  if (!image) return;
  try {
    await image.decode();
  } catch {
    return;
  }
  // srcset may report density-corrected naturalWidth. Bitmap dimensions match
  // the pixels used by drawImage, including high-DPR responsive images.
  const bitmap = await createImageBitmap(image);
  // Reuse the decoded fallback photo for small material patches. This supplies
  // photographic crumb/fruit detail without another image request.
  const patch = (
    x: number,
    y: number,
    width: number,
    height: number,
    crumb = false,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a2013";
    ctx.fillRect(0, 0, 256, 256);
    if (crumb) ctx.filter = "saturate(0.65) contrast(0.7) brightness(0.7)";
    const factor = bitmap.width / 1122;
    ctx.drawImage(
      bitmap,
      x * factor,
      y * factor,
      width * factor,
      height * factor,
      0,
      0,
      256,
      256,
    );
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    return texture;
  };
  const maps = new Map([
    ["Chocolate sponge — baked crumb", patch(720, 560, 80, 70, true)],
    ["Strawberry cut flesh", patch(135, 285, 95, 180)],
  ]);
  bitmap.close();
  const seen = new Set<Material>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const single = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    if (single.name.includes("sponge")) {
      // The joined GLB's custom layers can have empty primary UVs. Project the
      // photographic grain in metre-space, independent of mesh quantization.
      const positions = object.geometry.getAttribute("position");
      const normals = object.geometry.getAttribute("normal");
      const uv = new Float32Array(positions.count * 2);
      const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
      const point = new Vector3();
      const normal = new Vector3();
      for (let i = 0; i < positions.count; i++) {
        point
          .fromBufferAttribute(positions, i)
          .applyMatrix4(object.matrixWorld)
          .multiplyScalar(12);
        normal.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix);
        const up = Math.abs(normal.y) > 0.8;
        const radial = new Vector3(point.x, 0, point.z).normalize();
        const roundSide = !up && Math.abs(normal.dot(radial)) > 0.9;
        uv[i * 2] = roundSide
          ? Math.atan2(point.z, point.x) * Math.hypot(point.x, point.z)
          : Math.abs(normal.x) > Math.abs(normal.z)
            ? point.z
            : point.x;
        uv[i * 2 + 1] = up ? point.z : point.y;
      }
      object.geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    }
    if (single.name === "Strawberry cut flesh") {
      // Each disconnected flat cut face needs a complete fruit cross-section,
      // rather than tiled fruit patches across the whole joined cake.
      const geometry = object.geometry;
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const index = geometry.getIndex();
      const parents = Array.from({ length: positions.count }, (_, i) => i);
      const find = (i: number): number =>
        parents[i] === i ? i : (parents[i] = find(parents[i]));
      const join = (a: number, b: number) => {
        parents[find(a)] = find(b);
      };
      const samePosition = new Map<string, number>();
      for (let i = 0; i < positions.count; i++) {
        const key = `${positions.getX(i)},${positions.getY(i)},${positions.getZ(i)}`;
        const previous = samePosition.get(key);
        if (previous !== undefined) join(i, previous);
        else samePosition.set(key, i);
      }
      for (let i = 0; index && i < index.count; i += 3) {
        join(index.getX(i), index.getX(i + 1));
        join(index.getX(i), index.getX(i + 2));
      }
      const bounds = new Map<
        number,
        { minU: number; maxU: number; minV: number; maxV: number }
      >();
      const values = new Float32Array(positions.count * 2);
      const worldNormal = new Vector3();
      const worldPoint = new Vector3();
      const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
      for (let i = 0; i < positions.count; i++) {
        worldPoint
          .fromBufferAttribute(positions, i)
          .applyMatrix4(object.matrixWorld);
        worldNormal
          .fromBufferAttribute(normals, i)
          .applyNormalMatrix(normalMatrix);
        const u = worldPoint.x * worldNormal.z - worldPoint.z * worldNormal.x;
        const v = worldPoint.y;
        values[i * 2] = u;
        values[i * 2 + 1] = v;
        const group = find(i),
          b = bounds.get(group);
        if (b) {
          b.minU = Math.min(b.minU, u);
          b.maxU = Math.max(b.maxU, u);
          b.minV = Math.min(b.minV, v);
          b.maxV = Math.max(b.maxV, v);
        } else bounds.set(group, { minU: u, maxU: u, minV: v, maxV: v });
      }
      for (let i = 0; i < positions.count; i++) {
        const b = bounds.get(find(i))!;
        values[i * 2] =
          (values[i * 2] - b.minU) / Math.max(b.maxU - b.minU, 0.00001);
        values[i * 2 + 1] =
          (values[i * 2 + 1] - b.minV) / Math.max(b.maxV - b.minV, 0.00001);
      }
      geometry.setAttribute("uv", new Float32BufferAttribute(values, 2));
    }
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      const texture = maps.get(material.name);
      if (texture && "map" in material) {
        (material.map as Texture | null)?.dispose();
        material.map = texture;
      }
      if ("color" in material && "roughness" in material) {
        const surface = material as import("three").MeshStandardMaterial;
        if (material.name === "Chocolate glaze") {
          surface.color.set(0x321407);
          surface.roughness = 0.48;
        }
        if (material.name === "Vanilla cream") {
          surface.color.set(0xffd895);
          surface.roughness = 0.65;
        }
        if (material.name.includes("sponge"))
          surface.normalScale.setScalar(0.22);
        if (material.name === "Blueberry bloom") surface.roughness = 0.64;
        if (material.name === "Strawberry cut flesh") surface.roughness = 0.68;
      }
      if ("envMapIntensity" in material)
        material.envMapIntensity =
          material.name === "Chocolate glaze" ? 0.06 : 0.18;
      material.needsUpdate = true;
    }
  });
}
function acquire(image: HTMLImageElement | null) {
  users++;
  source ??= new GLTFLoader()
    .loadAsync("/models/yemape-chocolate.glb")
    .then(async (gltf) => {
      try {
        await applyPhotoMaterials(gltf.scene, image);
      } catch {
        // Embedded materials remain usable on browsers without bitmap support.
      }
      return gltf.scene;
    });
  const pending = source;
  return {
    pending,
    release: () => {
      if (--users !== 0 || source !== pending) return;
      source = null;
      void pending.then(disposeAsset, () => {});
    },
  };
}

export async function createDessertScene(
  host: HTMLDivElement,
  options: {
    paused: boolean;
    signal: AbortSignal;
    variant: "hero" | "spotlight";
  },
): Promise<DessertScene> {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = debug
    ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : "";
  const software =
    /SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic Render/i.test(gpu);
  const frameInterval = 1000 / (software ? 15 : 30);
  renderer.setPixelRatio(Math.min(devicePixelRatio, software ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = PCFShadowMap;
  const asset = acquire(host.querySelector("img"));
  let original: Group;
  try {
    original = await asset.pending;
  } catch (error) {
    asset.release();
    renderer.dispose();
    throw error;
  }
  if (options.signal.aborted) {
    asset.release();
    renderer.dispose();
    throw new DOMException("Aborted", "AbortError");
  }
  const world = new Scene();
  const rig = new Group();
  const model = original.clone(true);
  // Delivery camera and Blender lights are replaced by the responsive web rig.
  const remove: Object3D[] = [];
  model.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
    if (object.type.includes("Light") || object.type.includes("Camera"))
      remove.push(object);
  });
  remove.forEach((object) => object.removeFromParent());
  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  const scale = 4.4 / Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  model.position.copy(center).multiplyScalar(-scale);
  model.scale.setScalar(scale);
  rig.add(model);
  world.add(rig);
  const slice = model.getObjectByName("Slice");
  const sliceStart = slice?.position.clone();
  const sliceRotation = slice?.rotation.clone();
  const crumbs = model.getObjectByName("Crumbs");
  const camera = new PerspectiveCamera(31, 1, 0.1, 30);
  camera.position.set(0, 3.1, 7.5);
  camera.lookAt(0, 0, 0);
  world.add(new HemisphereLight(0xffedda, 0x392015, 1.0));
  const key = new DirectionalLight(0xffefd8, 1.8);
  key.position.set(-3, 4, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 15;
  key.shadow.bias = -0.001;
  key.shadow.normalBias = 0.018;
  world.add(key);
  const rim = new DirectionalLight(0xffcda2, 1.6);
  rim.position.set(3, 3, -4);
  world.add(rim);
  const fill = new DirectionalLight(0xdae4ff, 0.6);
  fill.position.set(4, 1, 3);
  world.add(fill);
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  world.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const canvas = renderer.domElement;
  canvas.className = "dessert-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Torta ilustrativa en 3D. Arrastra para girarla o usa las flechas izquierda y derecha.",
  );
  host.append(canvas);
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = preference.matches;
  let paused = options.paused;
  let visible = false;
  let mostlyVisible = false;
  let disposed = false;
  let failed = false;
  let painted = false;
  let frame = 0;
  let last = 0;
  let time = 0;
  let yaw = -0.45;
  let tilt = 0;
  let scroll = 0;
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;
  let dragYaw = yaw;
  let dragTilt = tilt;
  function isActive() {
    return (
      visible &&
      mostlyVisible &&
      !failed &&
      !paused &&
      !reduced &&
      !document.hidden &&
      !dragging
    );
  }
  function paint(now: number) {
    frame = 0;
    if (disposed) return;
    if (isActive() && last && now - last < frameInterval) {
      frame = requestAnimationFrame(paint);
      return;
    }
    const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (isActive()) {
      time += delta;
      yaw += delta * 0.32;
    }
    rig.rotation.set(
      tilt + (reduced ? 0 : Math.sin(time * 0.55) * 0.065 + scroll * 0.14),
      yaw,
      reduced ? 0 : Math.sin(time * 0.35) * 0.045 - scroll * 0.13,
    );
    if (slice && sliceStart && sliceRotation) {
      slice.position.copy(sliceStart);
      slice.rotation.copy(sliceRotation);
      const separation = reduced
        ? 0
        : 0.016 + 0.009 * Math.sin(time * 0.65) + Math.abs(scroll) * 0.016;
      slice.position.z += separation;
      slice.position.x += separation * 0.45;
      slice.rotation.y += reduced ? 0 : Math.sin(time * 0.65) * 0.1;
    }
    if (crumbs) crumbs.rotation.y = reduced ? 0 : Math.sin(time * 0.24) * 0.16;
    renderer.render(world, camera);
    painted = true;
    host.dataset.angle = yaw.toFixed(4);
    host.dataset.frames = String(renderer.info.render.frame);
    host.dataset.state = reduced ? "reduced" : isActive() ? "active" : "paused";
    if (isActive()) frame = requestAnimationFrame(paint);
  }
  function schedule() {
    if (!frame && !disposed && !failed && visible && !document.hidden)
      frame = requestAnimationFrame(paint);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    host.dataset.state = reduced ? "reduced" : isActive() ? "active" : "paused";
    if (isActive() || !painted) schedule();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    // Change the horizontal framing at narrow ratios, keeping object scale fixed.
    camera.fov = camera.aspect < 0.85 ? 37 : 31;
    camera.updateProjectionMatrix();
    schedule();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      mostlyVisible = entry.intersectionRatio >= 0.25;
      sync();
    },
    { threshold: [0, 0.25] },
  );
  observer.observe(host);
  function preferenceChange() {
    reduced = preference.matches;
    sync();
    schedule();
  }
  function onScroll() {
    if (!visible || reduced || paused) return;
    const bounds = host.getBoundingClientRect();
    scroll = Math.max(
      -1,
      Math.min(
        1,
        (innerHeight * 0.5 - bounds.top - bounds.height * 0.5) / innerHeight,
      ),
    );
    schedule();
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    dragYaw = yaw;
    dragTilt = tilt;
    canvas.setPointerCapture(event.pointerId);
    sync();
  }
  function pointerMove(event: PointerEvent) {
    if (!dragging) return;
    yaw = dragYaw + (event.clientX - pointerX) * 0.012;
    tilt = Math.max(
      -0.2,
      Math.min(0.25, dragTilt + (event.clientY - pointerY) * 0.004),
    );
    schedule();
  }
  function pointerUp() {
    dragging = false;
    sync();
  }
  function turn(direction: number) {
    yaw += (direction * Math.PI) / 4;
    commandPaint();
  }
  function commandPaint() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    // Explicit view commands paint immediately even when an IntersectionObserver
    // callback is still catching up with a touch device's scroll position.
    if (!failed && !disposed) paint(performance.now());
  }
  function keyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turn(event.key === "ArrowLeft" ? -1 : 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      yaw = -0.45;
      tilt = 0;
      commandPaint();
    }
  }
  function contextLost(event: Event) {
    event.preventDefault();
    failed = true;
    paused = true;
    cancelAnimationFrame(frame);
    frame = 0;
    host.dataset.renderer = "fallback";
    host.dataset.state = "paused";
    canvas.style.display = "none";
  }
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("keydown", keyDown);
  preference.addEventListener("change", preferenceChange);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("scroll", onScroll, { passive: true });
  resize();
  host.dataset.renderer = "ready";
  return {
    setPaused(value) {
      paused = value;
      sync();
    },
    turn,
    reset() {
      yaw = -0.45;
      tilt = 0;
      commandPaint();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      preference.removeEventListener("change", preferenceChange);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("scroll", onScroll);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("keydown", keyDown);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.remove();
      key.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      asset.release();
    },
  };
}
