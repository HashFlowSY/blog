import {
  Box3,
  CircleGeometry,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";

import { viseScrewPitch } from "./workbench-parts";

import type { Group } from "three";

export const maximumOpening = viseScrewPitch * 3;
const releaseOpening = 0.039;
const returnOpening = 0.027;
const tabletopImpactAt = 465;
const leavesDeskAt = tabletopImpactAt + 270;
const floorImpactAt = leavesDeskAt + 540;
const floorBounceEndsAt = floorImpactAt + 185;
const settledAt = floorBounceEndsAt + 165;
const seatedAt = 1140;
const clampedAt = seatedAt + 185;

type StockState =
  | { phase: "held" | "grounded" }
  | { phase: "falling" | "returning"; since: number };

export function createViseMechanism(
  jaw: Group,
  handle: Group,
  grip: Group,
  stock: Group,
  {
    rightEdge,
    floorHeight,
  }: { rightEdge: readonly [Vector3, Vector3]; floorHeight: number },
) {
  const axis = handle.pivot!.clone();
  handle.add(grip);
  const fixedPadDepth = 0.403;
  const movingPadDepth = 0.547;
  const stockBounds = new Box3().setFromObject(stock);
  const stockCenter = stockBounds.getCenter(new Vector3());
  const stockSize = stockBounds.getSize(new Vector3());
  const stockDepth = stockSize.z;
  const clampedTravel = fixedPadDepth + stockDepth - movingPadDepth;
  stock.pivot = stockCenter;
  // The outer end overhangs the jaw so the released stock can tip off its side.
  const held = stockCenter.clone().setZ(fixedPadDepth + stockDepth / 2);
  const [back, front] = rightEdge;
  const tabletopHeight = back.y;
  const edgeX = MathUtils.lerp(
    back.x,
    front.x,
    (held.z + 0.1 - back.z) / (front.z - back.z),
  );
  const tabletopHit = new Vector3(
    edgeX - 0.083,
    tabletopHeight + stockSize.x / 2,
    held.z + 0.024,
  );
  const edgeExit = new Vector3(edgeX + 0.145, tabletopHeight, held.z + 0.072);
  const floorHit = new Vector3(
    edgeX + 0.49,
    floorHeight + stockSize.y / 2,
    held.z + 0.155,
  );
  const floorBounceEnd = floorHit.clone().add(new Vector3(0.063, 0, 0.016));
  const floorLanding = floorBounceEnd.clone().add(new Vector3(0.03, 0, 0.013));
  const returnApex = held.y + 0.3;
  const arcStart = Math.sqrt(returnApex - floorLanding.y);
  const arcEnd = -Math.sqrt(returnApex - held.y);
  const tabletopRoll = -Math.PI / 2;
  const edgeRoll = -2.42;
  const floorRoll = -Math.PI * 2;
  let requestedOpening = 0;
  let opening = 0;
  let stockState: StockState = { phase: "held" };

  const shadowGeometry = new CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const shadowVertexCount = shadowGeometry.getAttribute("position").count;
  const shadowColors = new Float32Array(shadowVertexCount * 4).fill(1);
  for (let vertex = 1; vertex < shadowVertexCount; vertex++)
    shadowColors[vertex * 4 + 3] = 0;
  shadowGeometry.setAttribute(
    "color",
    new Float32BufferAttribute(shadowColors, 4),
  );
  const shadow = new Mesh(
    shadowGeometry,
    new MeshBasicMaterial({
      color: 0x746249,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      vertexColors: true,
    }),
  );
  shadow.scale.set(0.088, 1, 0.116);
  shadow.raycast = () => {};

  function pose(opening: number) {
    jaw.position.z = clampedTravel + opening;
    handle.position.z = clampedTravel + opening;
    handle.rotation.z = (opening / viseScrewPitch) * Math.PI * 2;
  }

  function bottomOffset(roll: number) {
    return (
      (stockSize.x * Math.abs(Math.sin(roll)) +
        stockSize.y * Math.abs(Math.cos(roll))) /
      2
    );
  }

  function placeStock(x: number, y: number, z: number, roll: number) {
    stock.position.set(x - stockCenter.x, y - stockCenter.y, z - stockCenter.z);
    stock.rotation.z = roll;
    const overTable = x < edgeX;
    const plane = overTable ? tabletopHeight : floorHeight;
    const clearance = y - bottomOffset(roll) - plane;
    const edgeFade = overTable
      ? MathUtils.smoothstep(edgeX - x, 0.025, 0.105)
      : 1;
    shadow.material.opacity =
      0.46 * (1 - MathUtils.smoothstep(clearance, 0, 0.16)) * edgeFade;
    shadow.visible = shadow.material.opacity > 0.005;
    shadow.position.set(x, plane + 0.0015, z);
  }

  function drawFall(elapsed: number) {
    if (elapsed <= tabletopImpactAt) {
      const t = elapsed / tabletopImpactAt;
      const across =
        0.8 * MathUtils.smoothstep(elapsed, 12, 340) + 0.2 * t ** 5;
      const roll =
        tabletopRoll *
        (0.87 * MathUtils.smoothstep(elapsed, 20, 365) + 0.13 * t ** 3);
      placeStock(
        MathUtils.lerp(held.x, tabletopHit.x, across),
        MathUtils.lerp(held.y, tabletopHit.y, t * t),
        MathUtils.lerp(
          held.z,
          tabletopHit.z,
          MathUtils.smoothstep(elapsed, 0, 130),
        ),
        roll,
      );
    } else if (elapsed <= leavesDeskAt) {
      const t =
        (elapsed - tabletopImpactAt) / (leavesDeskAt - tabletopImpactAt);
      const roll = MathUtils.lerp(
        tabletopRoll,
        edgeRoll,
        t * (0.35 + 0.65 * t),
      );
      placeStock(
        MathUtils.lerp(tabletopHit.x, edgeExit.x, t * (0.63 + 0.37 * t)),
        tabletopHeight + bottomOffset(roll) + 0.122 * 4 * t * (1 - t),
        MathUtils.lerp(tabletopHit.z, edgeExit.z, t),
        roll,
      );
    } else if (elapsed <= floorImpactAt) {
      const t = (elapsed - leavesDeskAt) / (floorImpactAt - leavesDeskAt);
      const roll = MathUtils.lerp(edgeRoll, floorRoll, t);
      const height =
        (tabletopHeight - floorHeight) * (1 - 0.29 * t - 0.71 * t * t);
      placeStock(
        MathUtils.lerp(edgeExit.x, floorHit.x, t * (1.34 - 0.34 * t)),
        floorHeight + bottomOffset(roll) + height,
        MathUtils.lerp(edgeExit.z, floorHit.z, t),
        roll,
      );
    } else if (elapsed <= floorBounceEndsAt) {
      const t = (elapsed - floorImpactAt) / (floorBounceEndsAt - floorImpactAt);
      placeStock(
        MathUtils.lerp(floorHit.x, floorBounceEnd.x, t),
        floorHit.y + 0.075 * 4 * t * (1 - t),
        MathUtils.lerp(floorHit.z, floorBounceEnd.z, t),
        floorRoll,
      );
    } else {
      const t = Math.min(
        1,
        (elapsed - floorBounceEndsAt) / (settledAt - floorBounceEndsAt),
      );
      const slide = t * (2 - t);
      placeStock(
        MathUtils.lerp(floorBounceEnd.x, floorLanding.x, slide),
        floorLanding.y,
        MathUtils.lerp(floorBounceEnd.z, floorLanding.z, slide),
        floorRoll,
      );
    }
  }

  function drawReturn(elapsed: number) {
    // Ease the progress along a single parabola from the floor into the jaws.
    const progress = MathUtils.smootherstep(elapsed, 0, seatedAt);
    const distanceFromApex = MathUtils.lerp(arcStart, arcEnd, progress);
    placeStock(
      MathUtils.lerp(floorLanding.x, held.x, progress),
      returnApex - distanceFromApex ** 2,
      MathUtils.lerp(floorLanding.z, held.z, progress),
      0,
    );
  }

  function updateJaw(now: number, instant: boolean) {
    let minimum = instant || stockState.phase === "held" ? 0 : releaseOpening;
    if (stockState.phase === "returning") {
      minimum *=
        1 - MathUtils.smoothstep(now - stockState.since, seatedAt, clampedAt);
    }
    opening = MathUtils.clamp(requestedOpening, minimum, maximumOpening);
    pose(opening);
  }

  function releaseIfOpen(now: number) {
    if (stockState.phase === "held" && requestedOpening >= releaseOpening) {
      stockState = { phase: "falling", since: now };
    }
  }

  placeStock(held.x, held.y, held.z, 0);
  pose(0);
  return {
    axis: axis.add(new Vector3(0, 0, clampedTravel)),
    shadow,
    get opening() {
      return opening;
    },
    get requestedOpening() {
      return requestedOpening;
    },
    get stockPhase() {
      return stockState.phase;
    },
    move(nextOpening: number, now: number, instant: boolean) {
      requestedOpening = MathUtils.clamp(nextOpening, 0, maximumOpening);
      releaseIfOpen(now);
      updateJaw(now, instant);
    },
    drawStock(now: number, instant: boolean) {
      if (stockState.phase === "falling") {
        const elapsed = instant
          ? settledAt
          : Math.max(0, now - stockState.since);
        drawFall(elapsed);
        if (elapsed < settledAt) return true;
        stockState = { phase: "grounded" };
      }
      if (
        stockState.phase === "grounded" &&
        requestedOpening <= returnOpening
      ) {
        stockState = { phase: "returning", since: now };
      }
      if (stockState.phase !== "returning") return false;

      const elapsed = instant ? clampedAt : now - stockState.since;
      drawReturn(elapsed);
      if (elapsed >= clampedAt) {
        stockState = { phase: "held" };
        releaseIfOpen(now);
      }
      updateJaw(now, instant);
      return stockState.phase !== "held";
    },
  };
}
