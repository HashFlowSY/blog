import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";

import { roundedProfile } from "./workbench-surfaces";

import type {
  WorkbenchKeyContact,
  WorkbenchMouseContact,
} from "./workbench-parts";
import type { Group } from "three";

function pressFeedback(
  body: Group,
  outline: Vector3[],
  width: number,
  inset: number,
  move: (press: number) => void,
) {
  const center = outline
    .reduce((sum, point) => sum.add(point), new Vector3())
    .divideScalar(outline.length);
  const edge = outline.map((point) => {
    const outward = point.clone().sub(center).setY(0).normalize();
    return [-inset, -inset * 0.36, 0.28, 0.64, 1.26].map((distance) =>
      point.clone().addScaledVector(outward, distance * width),
    );
  });
  const positions: number[] = [];
  const colors: number[] = [];
  const opacity = [0, 0.96, 1, 0.53, 0];
  for (let i = 0; i < edge.length; i++) {
    const next = (i + 1) % edge.length;
    for (let band = 0; band < opacity.length - 1; band++) {
      for (const [vertex, lane] of [
        [i, band],
        [next, band],
        [next, band + 1],
        [i, band],
        [next, band + 1],
        [i, band + 1],
      ] as const) {
        positions.push(...edge[vertex]![lane]!.toArray());
        colors.push(1, 1, 1, opacity[lane]!);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 4));
  const material = new MeshBasicMaterial({
    color: 0xffdb55,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexColors: true,
  });
  const rim = new Mesh(geometry, material);
  rim.visible = false;
  rim.raycast = () => {};
  body.add(rim);
  return {
    set(press: number, brightness: number) {
      move(press);
      rim.visible = brightness > 0.005;
      material.opacity = brightness;
    },
    dispose() {
      rim.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createKeyFeedback(
  body: Group,
  { center, width, depth, yaw }: WorkbenchKeyContact,
) {
  const up = new Vector3(0, 1, 0);
  const origin = new Vector3(...center);
  const outline = roundedProfile(width, depth, 0.002, 2).map(({ x, y: z }) =>
    new Vector3(x, 0.0009, z).applyAxisAngle(up, yaw).add(origin),
  );
  return pressFeedback(body, outline, 0.021, 0.32, (press) => {
    body.position.y = -0.011 * press;
  });
}

export function createMouseFeedback(
  body: Group,
  { outline, axis }: WorkbenchMouseContact,
) {
  const hinge = new Vector3(...axis);
  return pressFeedback(
    body,
    outline.map((point) => new Vector3(...point)),
    0.02,
    0.12,
    (press) => {
      body.quaternion.setFromAxisAngle(hinge, -0.05 * press);
    },
  );
}
