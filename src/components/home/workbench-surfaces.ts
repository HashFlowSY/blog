import {
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  ShapeUtils,
  Vector2,
  Vector3,
  Vector4,
} from "three";

import { artworkUv, calibrateArtworkQuad } from "./workbench-view";

type ArtworkQuad = readonly [Vector3, Vector3, Vector3, Vector3];
export interface SolidArtwork {
  front?: ArtworkQuad;
  sides?: readonly (ArtworkQuad | undefined)[];
}

function centerOf(points: readonly Vector3[]) {
  return points
    .reduce((center, point) => center.add(point), new Vector3())
    .divideScalar(points.length);
}

function face(
  points: readonly Vector3[],
  center: Vector3,
  artwork?: ArtworkQuad,
) {
  const a = points[0]!;
  const tangent = points[1]!.clone().sub(a).normalize();
  const normal = tangent.clone().cross(points[2]!.clone().sub(a)).normalize();
  const outward = normal.dot(centerOf(points).sub(center)) > 0;
  const positions: number[] = [];
  const artworkPositions: number[] = [];
  const samples = artwork && calibrateArtworkQuad(artwork);
  const uv: number[] = [];
  const bitangent = normal.clone().cross(tangent);
  const offset = new Vector3();
  for (let i = 1; i < points.length - 1; i++) {
    for (const index of [0, outward ? i : i + 1, outward ? i + 1 : i]) {
      const point = points[index]!;
      positions.push(...point.toArray());
      if (samples) artworkPositions.push(...samples[index]!.toArray());
      offset.copy(point).sub(a);
      uv.push(offset.dot(tangent), offset.dot(bitangent));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  if (artwork)
    geometry.setAttribute(
      "artworkPosition",
      new Float32BufferAttribute(artworkPositions, 3),
    );
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// Both caps and all connecting sides are real surfaces with shared boundaries.
export function solidSurfaces(
  front: readonly Vector3[],
  back: readonly Vector3[],
  artwork?: SolidArtwork,
) {
  const center = centerOf([...front, ...back]);
  const sides = front.map((point, i) => {
    const next = (i + 1) % front.length;
    return face(
      [point, front[next]!, back[next]!, back[i]!],
      center,
      artwork?.sides?.[i],
    );
  });
  return {
    front: face(front, center, artwork?.front),
    back: face(back, center),
    sides,
  };
}

export function setSurfaceArtwork(geometry: BufferGeometry) {
  const samples = geometry.getAttribute("artworkPosition");
  geometry.deleteAttribute("artworkPosition");
  const coordinates = new Float32Array(
    geometry.getAttribute("position").count * 4,
  );
  if (samples) {
    const point = new Vector3();
    const clip = new Vector4();
    for (let i = 0; i < samples.count; i++) {
      const [x, y, w] = artworkUv(point.fromBufferAttribute(samples, i), clip);
      coordinates.set([x, y, w, 1], i * 4);
    }
  }
  geometry.setAttribute("pencilUv", new Float32BufferAttribute(coordinates, 4));
}

interface BoardHole {
  x: number;
  y: number;
  radius: number;
}

export function perforatedBoard(
  bounds: { left: number; right: number; bottom: number; top: number },
  holes: readonly (readonly BoardHole[])[],
  depth: number,
) {
  const { left, right, bottom, top } = bounds;
  // Adjacent cells share their exact corners. Each cap is triangulated locally
  // so lines of nearly collinear holes cannot create long, thin triangles.
  const xCuts = [
    left,
    ...holes[0]!.slice(1).map((_, column) => {
      const after = Math.max(
        ...holes.map((row) => row[column]!.x + row[column]!.radius),
      );
      const before = Math.min(
        ...holes.map((row) => row[column + 1]!.x - row[column + 1]!.radius),
      );
      return MathUtils.clamp((after + before) / 2, left, right);
    }),
    right,
  ];
  const yCuts = xCuts.map((x, column) => {
    const index = MathUtils.clamp(column - 1, 0, holes[0]!.length - 2);
    const centerY = holes.map((row) => {
      const a = row[index]!;
      const b = row[index + 1]!;
      return MathUtils.lerp(a.y, b.y, (x - a.x) / (b.x - a.x));
    });
    return [
      top,
      ...centerY
        .slice(1)
        .map((y, row) => MathUtils.clamp((centerY[row]! + y) / 2, bottom, top)),
      bottom,
    ];
  });

  const panelPositions: number[] = [];
  const borePositions: number[] = [];
  function vertex(positions: number[], point: Vector2, z: number) {
    positions.push(point.x, point.y, z);
  }
  function wall(positions: number[], a: Vector2, b: Vector2) {
    vertex(positions, a, 0);
    vertex(positions, b, 0);
    vertex(positions, b, depth);
    vertex(positions, a, 0);
    vertex(positions, b, depth);
    vertex(positions, a, depth);
  }
  for (const [row, cells] of holes.entries()) {
    for (const [column, { x, y, radius }] of cells.entries()) {
      const x0 = xCuts[column]!;
      const x1 = xCuts[column + 1]!;
      if (x0 === x1) continue;
      const edge0 = yCuts[column]!;
      const edge1 = yCuts[column + 1]!;
      const cell = [
        new Vector2(x0, edge0[row]!),
        new Vector2(x0, edge0[row + 1]!),
        new Vector2(x1, edge1[row + 1]!),
        new Vector2(x1, edge1[row]!),
      ];
      const contour = cell.filter(
        (point, i) => !point.equals(cell[(i + 3) % 4]!),
      );
      if (contour.length < 3) continue;
      const ring =
        x - radius > left &&
        x + radius < right &&
        y - radius > bottom &&
        y + radius < top
          ? Array.from({ length: 8 }, (_, i) => {
              const angle = (i * Math.PI) / 4;
              return new Vector2(
                x + radius * Math.cos(angle),
                y + radius * Math.sin(angle),
              );
            })
          : [];
      const points = [...contour, ...ring];
      for (const [i, j, k] of ShapeUtils.triangulateShape(
        contour,
        ring.length ? [ring] : [],
      )) {
        const a = points[i!]!;
        const b = points[j!]!;
        const c = points[k!]!;
        vertex(panelPositions, a, depth);
        vertex(panelPositions, b, depth);
        vertex(panelPositions, c, depth);
        vertex(panelPositions, c, 0);
        vertex(panelPositions, b, 0);
        vertex(panelPositions, a, 0);
      }
      ring.forEach((a, i) =>
        wall(borePositions, ring[(i + 1) % ring.length]!, a),
      );
    }
  }
  const perimeter = [
    new Vector2(left, top),
    new Vector2(left, bottom),
    new Vector2(right, bottom),
    new Vector2(right, top),
  ];
  perimeter.forEach((a, i) =>
    wall(panelPositions, a, perimeter[(i + 1) % perimeter.length]!),
  );
  function geometryFrom(positions: number[]) {
    const uv: number[] = [];
    for (let i = 0; i < positions.length; i += 3)
      uv.push(positions[i]!, positions[i + 1]!);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    return geometry;
  }
  return {
    panel: geometryFrom(panelPositions),
    bores: geometryFrom(borePositions),
  };
}
