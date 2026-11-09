import {
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Spherical,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { assetPath } from "@/lib/site";

import { buildWorkbenchModel } from "./workbench-model";

export interface WorkbenchScene {
  rotate(azimuth: number, elevation: number): void;
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

export async function createWorkbenchScene(
  canvas: HTMLCanvasElement,
): Promise<WorkbenchScene> {
  const loader = new TextureLoader();
  const textures = await Promise.allSettled([
    loader.loadAsync(assetPath("/assets/workbench-graphite-atlas.webp")),
    loader.loadAsync(assetPath("/assets/workbench-pencil-detail.webp")),
  ]);
  const [graphiteResult, screenResult] = textures;
  if (
    graphiteResult.status === "rejected" ||
    screenResult.status === "rejected"
  ) {
    for (const result of textures)
      if (result.status === "fulfilled") result.value.dispose();
    throw new Error("Unable to load the workbench drawing textures");
  }
  const graphite = graphiteResult.value,
    screen = screenResult.value;
  graphite.colorSpace = SRGBColorSpace;
  screen.colorSpace = SRGBColorSpace;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch (error) {
    graphite.dispose();
    screen.dispose();
    throw error;
  }
  renderer.debug.onShaderError = () => {
    throw new Error("Unable to render the workbench pencil materials");
  };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  graphite.anisotropy = screen.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const scene = new Scene();
  const camera = new PerspectiveCamera(27, 1.52, 0.1, 80);
  camera.position.set(8.3, 7.4, 18.4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.3, 3.65, 0.25);
  const initialDistance = camera.position.distanceTo(controls.target);
  controls.enablePan = false;
  controls.enableDamping = !window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.75;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.3;
  controls.minDistance = initialDistance / controls.maxZoom;
  controls.maxDistance = initialDistance / controls.minZoom;
  controls.minPolarAngle = 0.04;
  controls.maxPolarAngle = Math.PI - 0.04;
  // No azimuth limit: the camera can continuously orbit through every side.
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.update();
  controls.saveState();
  scene.add(new HemisphereLight(0xffffff, 0xd8d4c9, 1.4));
  const key = new DirectionalLight(0xffffff, 1.7);
  key.position.set(-4, 11, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -7,
    right: 7,
    top: 8,
    bottom: -6,
    near: 0.5,
    far: 32,
  });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new DirectionalLight(0xffffff, 0.65);
  fill.position.set(6, 5, -7);
  scene.add(fill);
  const model = buildWorkbenchModel(graphite, screen);
  scene.add(model.group);
  const floor = new Mesh(
    new PlaneGeometry(15, 13),
    new ShadowMaterial({ color: 0x716b60, opacity: 0.055, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.015;
  floor.receiveShadow = true;
  scene.add(floor);

  let frame: number | undefined;
  let disposed = false;
  let renderWidth = 0,
    renderHeight = 0;
  let lastAzimuth = controls.getAzimuthalAngle();
  let travelled = 0;
  const initialPolar = controls.getPolarAngle();

  function metrics() {
    const angle = controls.getAzimuthalAngle();
    travelled += Math.atan2(
      Math.sin(angle - lastAzimuth),
      Math.cos(angle - lastAzimuth),
    );
    lastAzimuth = angle;
    canvas.dataset["yaw"] = String(
      Math.round(MathUtils.radToDeg(travelled) * 1000) / 1000,
    );
    canvas.dataset["pitch"] = String(
      Math.round(
        MathUtils.radToDeg(initialPolar - controls.getPolarAngle()) * 1000,
      ) / 1000,
    );
    canvas.dataset["zoom"] = String(
      Math.round(
        ((camera.zoom * initialDistance) /
          camera.position.distanceTo(controls.target)) *
          1e6,
      ) / 1e6,
    );
    canvas.dataset["cameraX"] = String(camera.position.x);
    canvas.dataset["cameraY"] = String(camera.position.y);
    canvas.dataset["cameraZ"] = String(camera.position.z);
  }
  function render() {
    frame = undefined;
    if (disposed) return;
    const moving = controls.update();
    renderer.render(scene, camera);
    metrics();
    canvas.dataset["triangles"] = String(renderer.info.render.triangles);
    canvas.dataset["drawCalls"] = String(renderer.info.render.calls);
    if (moving) requestRender();
  }
  function requestRender() {
    if (!disposed && frame === undefined)
      frame = window.requestAnimationFrame(render);
  }
  function changed() {
    metrics();
    requestRender();
  }
  function resize() {
    if (disposed) return;
    const width = canvas.clientWidth || 1,
      height = canvas.clientHeight || 1;
    if (width === renderWidth && height === renderHeight) return;
    renderWidth = width;
    renderHeight = height;
    const aspect = width / height;
    // Match the width-driven SVG drawing at both desktop and phone sizes.
    // Extra height on a narrow phone must not enlarge the finished object.
    const halfHeight = Math.max(4.8, 7.3 / aspect);
    camera.aspect = aspect;
    camera.fov = MathUtils.radToDeg(
      2 * Math.atan(halfHeight / initialDistance),
    );
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  }
  function start() {
    canvas.dataset["dragging"] = "true";
    requestRender();
  }
  function end() {
    canvas.dataset["dragging"] = "false";
    requestRender();
  }
  controls.addEventListener("change", changed);
  controls.addEventListener("start", start);
  controls.addEventListener("end", end);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function dispose() {
    disposed = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    model.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    graphite.dispose();
    screen.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  try {
    resize();
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    render();
  } catch (error) {
    dispose();
    throw error;
  }
  canvas.dataset["renderer"] = "webgl2";
  canvas.dataset["parts"] = String(model.partCount);

  return {
    rotate(azimuth, elevation) {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += MathUtils.degToRad(azimuth);
      spherical.phi = MathUtils.clamp(
        spherical.phi - MathUtils.degToRad(elevation),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      camera.position
        .copy(controls.target)
        .add(new Vector3().setFromSpherical(spherical));
      controls.update();
      changed();
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = MathUtils.clamp(
        offset.length() / factor,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      changed();
    },
    reset() {
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.reset();
      controls.enableDamping = damping;
      travelled = 0;
      lastAzimuth = controls.getAzimuthalAngle();
      metrics();
      requestRender();
    },
    dispose,
  };
}
