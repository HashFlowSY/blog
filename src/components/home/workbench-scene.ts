import {
  MathUtils,
  Scene,
  Spherical,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createWorkbenchInput } from "./workbench-input";
import { createWorkbenchInteractions } from "./workbench-interactions";
import { buildWorkbenchModel } from "./workbench-model";
import { createScreenDrawing } from "./workbench-screen-drawing";
import { workbenchTexture } from "./workbench-textures";
import {
  artworkWidth,
  createArtworkCamera,
  orbitTarget,
  setArtworkView,
} from "./workbench-view";

export interface WorkbenchScene {
  rotate(azimuth: number, elevation: number): void;
  zoom(factor: number): void;
  reset(): void;
  resetAt(x: number, y: number): void;
  dispose(): void;
}

export async function createWorkbenchScene(
  canvas: HTMLCanvasElement,
  onMessage: (message: string) => void,
): Promise<WorkbenchScene> {
  const atlas = await new TextureLoader().loadAsync(workbenchTexture);
  atlas.colorSpace = SRGBColorSpace;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch (error) {
    atlas.dispose();
    throw error;
  }
  renderer.debug.onShaderError = () => {
    throw new Error("Unable to render the workbench pencil materials");
  };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new Scene();
  const camera = createArtworkCamera();
  // OrbitControls encodes zoom as a dolly distance. Use that distance for
  // input only so zoom never brings the rendered camera into the model.
  const orbit = camera.clone();
  const controls = new OrbitControls(orbit, canvas);
  controls.target.set(...orbitTarget);
  const restingPosition = orbit.position.clone();
  const direction = new Vector3();
  const initialDistance = orbit.position.distanceTo(controls.target);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion.matches;
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
  let frame: number | undefined;
  let disposed = false;
  let dirty = true;
  const { model, interactions, input } = assembleScene();

  function assembleScene() {
    let model: ReturnType<typeof buildWorkbenchModel> | undefined;
    let interactions:
      | ReturnType<typeof createWorkbenchInteractions>
      | undefined;
    try {
      const workbench = buildWorkbenchModel(atlas);
      model = workbench;
      scene.add(workbench.group);
      interactions = createWorkbenchInteractions(
        workbench,
        (device) => createScreenDrawing(device, workbench, renderer),
        reducedMotion,
        onMessage,
        requestRender,
      );
      const input = createWorkbenchInput(
        canvas,
        camera,
        model.group,
        interactions,
        requestFrame,
      );
      return { model, interactions, input };
    } catch (error) {
      interactions?.dispose();
      model?.dispose();
      controls.dispose();
      atlas.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      throw error;
    }
  }
  let renderWidth = 0,
    renderHeight = 0;
  let lastTime: number | undefined;
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
    canvas.dataset["zoom"] = String(Math.round(camera.zoom * 1e6) / 1e6);
    canvas.dataset["cameraX"] = String(camera.position.x);
    canvas.dataset["cameraY"] = String(camera.position.y);
    canvas.dataset["cameraZ"] = String(camera.position.z);
  }
  function render(now = performance.now()) {
    frame = undefined;
    if (disposed) return;
    const repaint = dirty;
    dirty = false;
    const dt =
      lastTime === undefined
        ? 1 / 60
        : MathUtils.clamp((now - lastTime) / 1000, 1 / 120, 0.03);
    lastTime = now;
    const moving = controls.update();
    direction.copy(orbit.position).sub(controls.target);
    const zoom = initialDistance / direction.length();
    camera.position
      .copy(controls.target)
      .add(direction.setLength(initialDistance));
    camera.quaternion.copy(orbit.quaternion);
    if (Math.abs(camera.zoom - zoom) > 1e-10) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    const dragging = canvas.dataset["dragging"] === "true";
    input.updateHover(moving || dragging);
    const animating = interactions.tick(now, dt);
    if (!repaint && !moving && !animating) return;
    renderer.render(scene, camera);
    // Both layers change in the same paint, after the new camera frame exists.
    if (
      orbit.position.distanceToSquared(restingPosition) > 1e-10 ||
      animating ||
      interactions.changedPose
    )
      canvas.dataset["view"] = "model";
    else if (!moving && !dragging) canvas.dataset["view"] = "drawing";
    metrics();
    canvas.dataset["triangles"] = String(renderer.info.render.triangles);
    if (moving || animating) requestRender();
  }
  function requestRender() {
    dirty = true;
    requestFrame();
  }
  function requestFrame() {
    if (!disposed && frame === undefined)
      frame = window.requestAnimationFrame(render);
  }
  function changed() {
    metrics();
    requestRender();
  }
  function resize() {
    if (disposed) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    if (width === renderWidth && height === renderHeight) return;
    renderWidth = width;
    renderHeight = height;
    const style = getComputedStyle(canvas);
    const framing = Number(style.getPropertyValue("--workbench-framing"));
    const drawingWidth =
      Number.parseFloat(style.getPropertyValue("--workbench-drawing-width")) /
      100;
    const drawingLeft =
      Number.parseFloat(style.getPropertyValue("--workbench-drawing-left")) /
      100;
    const drawingTop =
      Number.parseFloat(style.getPropertyValue("--workbench-drawing-top")) /
      100;
    setArtworkView(
      camera,
      width,
      height,
      (width * drawingWidth * framing) / artworkWidth,
      width * (0.5 + (drawingLeft - 0.5) * framing),
      height * (0.5 + (drawingTop - 0.5) * framing),
    );
    renderer.setSize(width, height, false);
    requestRender();
  }
  function resetView() {
    controls.enableDamping = false;
    controls.update();
    controls.reset();
    controls.enableDamping = !reducedMotion.matches;
    travelled = 0;
    lastAzimuth = controls.getAzimuthalAngle();
    metrics();
    requestRender();
  }
  function syncMotionPreference() {
    controls.enableDamping = !reducedMotion.matches;
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
  reducedMotion.addEventListener("change", syncMotionPreference);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function dispose() {
    disposed = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    observer.disconnect();
    reducedMotion.removeEventListener("change", syncMotionPreference);
    input.dispose();
    interactions.dispose();
    controls.dispose();
    model.dispose();
    atlas.dispose();
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

  return {
    rotate(azimuth, elevation) {
      const offset = orbit.position.clone().sub(controls.target);
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += MathUtils.degToRad(azimuth);
      spherical.phi = MathUtils.clamp(
        spherical.phi - MathUtils.degToRad(elevation),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      orbit.position
        .copy(controls.target)
        .add(new Vector3().setFromSpherical(spherical));
      controls.update();
      changed();
    },
    zoom(factor) {
      const offset = orbit.position.clone().sub(controls.target);
      const distance = MathUtils.clamp(
        offset.length() / factor,
        controls.minDistance,
        controls.maxDistance,
      );
      orbit.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      changed();
    },
    reset: resetView,
    resetAt(x, y) {
      if (!input.hitPart(x, y)) resetView();
    },
    dispose,
  };
}
