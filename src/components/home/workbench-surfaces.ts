import {
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";

function centerOf(points: readonly Vector3[]) {
  return points
    .reduce((center, point) => center.add(point), new Vector3())
    .divideScalar(points.length);
}

function face(points: readonly Vector3[], center: Vector3) {
  const a = points[0]!;
  const tangent = points[1]!.clone().sub(a).normalize();
  const normal = tangent.clone().cross(points[2]!.clone().sub(a)).normalize();
  const outward = normal.dot(centerOf(points).sub(center)) > 0;
  const positions: number[] = [];
  const uv: number[] = [];
  const bitangent = normal.clone().cross(tangent);
  const offset = new Vector3();
  for (let i = 1; i < points.length - 1; i++) {
    for (const index of [0, outward ? i : i + 1, outward ? i + 1 : i]) {
      const point = points[index]!;
      positions.push(...point.toArray());
      offset.copy(point).sub(a);
      uv.push(offset.dot(tangent), offset.dot(bitangent));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// Both caps and all connecting sides are real surfaces with shared boundaries.
export function solidSurfaces(
  front: readonly Vector3[],
  back: readonly Vector3[],
) {
  const center = centerOf([...front, ...back]);
  const sides = front.map((point, i) => {
    const next = (i + 1) % front.length;
    return face([point, front[next]!, back[next]!, back[i]!], center);
  });
  return {
    front: face(front, center),
    back: face(back, center),
    sides,
  };
}

export function roundedProfile(
  width: number,
  height: number,
  radius: number,
  segments = 3,
) {
  const halfWidth = width / 2 - radius;
  const halfHeight = height / 2 - radius;
  return (
    [
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
      [-halfWidth, -halfHeight],
    ] as const
  ).flatMap(([x, y], corner) =>
    Array.from({ length: segments + 1 }, (_, step) => {
      const angle = ((corner - 1 + step / segments) * Math.PI) / 2;
      return new Vector2(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
      );
    }),
  );
}

// Matching rings give the rounded parts a continuous outline. Compute smooth
// normals before splitting the UV seam, then unwrap each band by its length.
export function loftSurfaces(rings: readonly (readonly Vector3[])[]) {
  const first = rings[0]!;
  const last = rings.at(-1)!;
  const normal = new Vector3();
  const cross = new Vector3();
  first.forEach((point, i) => {
    normal.add(cross.crossVectors(point, first[(i + 1) % first.length]!));
  });
  normal.normalize();
  const along = centerOf(last).sub(centerOf(first));
  const forward = normal.dot(along) > 0;
  if (!forward) normal.negate();

  function cap(ring: readonly Vector3[], side: number) {
    const x = ring[1]!.clone().sub(ring[0]!).normalize();
    const y = new Vector3().crossVectors(normal, x).multiplyScalar(side);
    const plane = ring.map((point) => new Vector2(point.dot(x), point.dot(y)));
    const positions: number[] = [];
    const uv: number[] = [];
    for (const triangle of ShapeUtils.triangulateShape(plane, [])) {
      const [a, b, c] = triangle as [number, number, number];
      const ab = plane[b]!.clone().sub(plane[a]!);
      const ac = plane[c]!.clone().sub(plane[a]!);
      for (const index of ab.cross(ac) > 0 ? [a, b, c] : [a, c, b]) {
        positions.push(...ring[index]!.toArray());
        uv.push(...plane[index]!.toArray());
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    return geometry;
  }

  const middle = rings[Math.floor(rings.length / 2)]!;
  const length = first.length;
  const around = [0];
  middle.forEach((point, i) => {
    around.push(around[i]! + point.distanceTo(middle[(i + 1) % length]!));
  });
  const heights = [0];
  for (let i = 1; i < rings.length; i++) {
    const distance = rings[i]!.reduce(
      (sum, point, index) => sum + point.distanceTo(rings[i - 1]![index]!),
      0,
    );
    heights.push(heights[i - 1]! + distance / length);
  }
  const width = around.at(-1)!;
  const height = heights.at(-1)!;
  const index: number[] = [];
  const uv: number[] = [];
  const winding = forward ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < length; j++) {
      const next = (j + 1) % length;
      const vertices = [
        i * length + j,
        i * length + next,
        (i + 1) * length + next,
        (i + 1) * length + j,
      ];
      const u = [around[j]!, around[j + 1]!, around[j + 1]!, around[j]!];
      const v = [heights[i]!, heights[i]!, heights[i + 1]!, heights[i + 1]!];
      for (const corner of winding) {
        index.push(vertices[corner]!);
        uv.push(u[corner]! / width, v[corner]! / height);
      }
    }
  }
  const indexed = new BufferGeometry();
  indexed.setIndex(index);
  indexed.setAttribute(
    "position",
    new Float32BufferAttribute(
      rings.flatMap((ring) => ring.flatMap((point) => point.toArray())),
      3,
    ),
  );
  indexed.computeVertexNormals();
  const wall = indexed.toNonIndexed();
  indexed.dispose();
  wall.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return {
    start: cap(first, -1),
    end: cap(last, 1),
    wall,
    uvSize: [width, height] as const,
  };
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
