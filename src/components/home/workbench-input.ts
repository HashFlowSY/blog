import { Mesh, Plane, Raycaster, Vector2, Vector3 } from "three";

import { actionForPart } from "./workbench-parts";

import type { createWorkbenchInteractions } from "./workbench-interactions";
import type { WorkbenchAction, WorkbenchPart } from "./workbench-parts";
import type { Camera, Group, Intersection, Object3D } from "three";

interface PartHit {
  name: WorkbenchPart;
  action: WorkbenchAction;
}

type PartInput = Pick<
  ReturnType<typeof createWorkbenchInteractions>,
  | "activate"
  | "sweep"
  | "visePivot"
  | "startTurningVise"
  | "turnVise"
  | "stopTurningVise"
>;

export function createWorkbenchInput(
  canvas: HTMLCanvasElement,
  camera: Camera,
  model: Group,
  interactions: PartInput,
  requestFrame: () => void,
) {
  const lifetime = new AbortController();
  const capture = { capture: true, signal: lifetime.signal };
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hits: Intersection[] = [];
  const targets: Mesh[] = [];
  const occluders: Mesh[] = [];
  const actions = new Map<Object3D, PartHit>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.computeBoundingBox();
    const name = object.userData["part"] as WorkbenchPart | undefined;
    const action = name && actionForPart(name);
    if (name && action) {
      targets.push(object);
      actions.set(object, { name, action });
    } else occluders.push(object);
  });

  function aim(x: number, y: number) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    ndc.set(
      ((x - bounds.left) / bounds.width) * 2 - 1,
      1 - ((y - bounds.top) / bounds.height) * 2,
    );
    raycaster.setFromCamera(ndc, camera);
    return true;
  }

  function pick(x: number, y: number): PartHit | undefined {
    if (!aim(x, y) || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return;
    model.updateMatrixWorld(true);
    hits.length = 0;
    const [target] = raycaster.intersectObjects(targets, false, hits);
    if (!target) return;
    hits.length = 0;
    raycaster.far = target.distance - 1e-6;
    raycaster.intersectObjects(occluders, false, hits);
    raycaster.far = Infinity;
    return hits.length === 0 ? actions.get(target.object) : undefined;
  }

  const handlePlane = new Plane(new Vector3(0, 0, 1));
  const pivot = new Vector3();
  const intersection = new Vector3();
  function handleAngle(event: PointerEvent) {
    if (
      !aim(event.clientX, event.clientY) ||
      Math.abs(raycaster.ray.direction.z) < 0.18
    )
      return;
    interactions.visePivot(pivot);
    handlePlane.constant = -pivot.z;
    if (!raycaster.ray.intersectPlane(handlePlane, intersection)) return;
    intersection.sub(pivot);
    if (Math.hypot(intersection.x, intersection.y) < 0.06) return;
    return Math.atan2(intersection.y, intersection.x);
  }

  const pointers = new Set<number>();
  let press:
    | (PartHit & {
        id: number;
        x: number;
        y: number;
        drag: boolean;
        crank?: { angle: number | undefined; turning: boolean };
      })
    | undefined;
  let hovered: WorkbenchPart | undefined;
  let pending: { x: number; y: number; sign: number } | undefined;
  let pointerX: number | undefined;

  function clearHover() {
    hovered = undefined;
    pending = undefined;
    pointerX = undefined;
    delete canvas.dataset["actionable"];
  }

  function cancelPress() {
    if (press?.crank?.turning) interactions.stopTurningVise();
    press = undefined;
  }

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      pointers.add(event.pointerId);
      clearHover();
      cancelPress();
      if (pointers.size !== 1 || event.button !== 0) return;
      const hit = pick(event.clientX, event.clientY);
      if (!hit) return;
      press = {
        ...hit,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        drag: false,
      };
      if (hit.action === "vise") {
        const angle = handleAngle(event);
        if (angle !== undefined) press.crank = { angle, turning: false };
      }
    },
    capture,
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (press?.id === event.pointerId) {
        const threshold = event.pointerType === "touch" ? 10 : 3;
        press.drag ||=
          Math.hypot(event.clientX - press.x, event.clientY - press.y) >
          threshold;
        if (!press.drag || press.crank) event.stopImmediatePropagation();
        if (press.drag && press.crank) {
          const crank = press.crank;
          if (!crank.turning) {
            crank.turning = true;
            interactions.startTurningVise();
          }
          const angle = handleAngle(event);
          if (angle !== undefined && crank.angle !== undefined) {
            const delta = angle - crank.angle;
            interactions.turnVise(Math.atan2(Math.sin(delta), Math.cos(delta)));
          }
          crank.angle = angle;
        }
        return;
      }
      if (pointers.size || event.buttons || event.pointerType === "touch")
        return;
      pending = {
        x: event.clientX,
        y: event.clientY,
        sign: event.clientX < (pointerX ?? event.clientX) ? -1 : 1,
      };
      pointerX = event.clientX;
      requestFrame();
    },
    capture,
  );

  canvas.addEventListener(
    "pointerup",
    (event) => {
      pointers.delete(event.pointerId);
      if (press?.id !== event.pointerId) return;
      if (!press.drag) {
        const hit = pick(event.clientX, event.clientY);
        if (
          hit?.action === press.action &&
          (hit.name === press.name ||
            (hit.action !== "plant" && hit.action !== "tools"))
        ) {
          interactions.activate(hit.name);
        }
      }
      cancelPress();
    },
    capture,
  );

  for (const type of ["pointercancel", "lostpointercapture"] as const) {
    canvas.addEventListener(
      type,
      (event) => {
        pointers.delete(event.pointerId);
        if (press?.id === event.pointerId) cancelPress();
      },
      capture,
    );
  }
  canvas.addEventListener("pointerleave", clearHover, capture);

  return {
    cancelGesture() {
      cancelPress();
      pointers.clear();
      clearHover();
    },
    hitPart(x: number, y: number) {
      return Boolean(pick(x, y));
    },
    updateHover(cameraMoving: boolean) {
      const sample = pending;
      pending = undefined;
      if (!sample || cameraMoving || pointers.size) return;
      const hit = pick(sample.x, sample.y);
      if (hit && hit.action !== "vise") canvas.dataset["actionable"] = "true";
      else delete canvas.dataset["actionable"];
      if (hit && hit.name !== hovered)
        interactions.sweep(hit.name, sample.sign);
      hovered = hit?.name;
    },
    dispose() {
      lifetime.abort();
    },
  };
}
