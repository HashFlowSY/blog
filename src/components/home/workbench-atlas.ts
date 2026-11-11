import { Float32BufferAttribute, Vector3 } from "three";

import { artworkCameraPosition } from "./workbench-view";

import type { WorkbenchFinish } from "./workbench-materials";
import type { ArtworkPoint } from "./workbench-view";
import type { BufferGeometry } from "three";

export const artworkLayers = {
  board: "tools",
  boardHardware: "tools",
  cabinet: "foundation",
  case: "foundation",
  desk: "surface",
  deskTools: "surface",
  display: "surface",
  frame: "foundation",
  laptop: "surface",
  shelf: "tools",
  shelfObjects: "tools",
  stool: "foundation",
  vise: "surface",
} as const;

export type ArtworkRegion = keyof typeof artworkLayers;
export type ArtworkLayer = (typeof artworkLayers)[ArtworkRegion];
export type ArtworkQuad = readonly [
  ArtworkPoint,
  ArtworkPoint,
  ArtworkPoint,
  ArtworkPoint,
];

export interface SurfaceProjection {
  corners: readonly Vector3[];
  pixels: ArtworkQuad;
}

export interface InkStroke {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  width: number;
  strength: number;
}

export interface WorkbenchSurface {
  geometry: BufferGeometry;
  finish: WorkbenchFinish;
  region: ArtworkRegion;
  outline: boolean;
  projection?: SurfaceProjection;
  uvSize?: readonly [width: number, height: number];
  sourceInk?: false;
  strokes?: readonly InkStroke[];
}

export const atlasWidth = 2048;
export const atlasHeight = 2560;

export interface WorkbenchChart {
  surface: WorkbenchSurface;
  triangles: number[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UnpackedChart extends WorkbenchChart {
  points: number[];
}

const padding = 5;

// Give each side of a solid its own chart. The selection and packing are the
// same in the asset generator and viewer, including for curved primitives.
export function layoutWorkbenchAtlas(surfaces: readonly WorkbenchSurface[]) {
  const charts: UnpackedChart[] = [];
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  for (const surface of surfaces) {
    const position = surface.geometry.getAttribute("position");
    const uvSize = surface.uvSize;
    const uv = surface.geometry.getAttribute("uv");
    const sides = Array.from({ length: uvSize ? 1 : 6 }, () => ({
      triangles: [] as number[],
      points: [] as number[],
      minU: Infinity,
      minV: Infinity,
      maxU: -Infinity,
      maxV: -Infinity,
    }));
    const center = new Vector3();
    const axis = new Vector3();
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, i + 1).sub(a);
      c.fromBufferAttribute(position, i + 2).sub(a);
      axis.crossVectors(b, c);
      const x = Math.abs(axis.x),
        y = Math.abs(axis.y),
        z = Math.abs(axis.z);
      const normal = x > y && x > z ? 0 : y > z ? 1 : 2;
      const side =
        sides[uvSize ? 0 : normal * 2 + Number(axis.getComponent(normal) < 0)]!;
      side.triangles.push(i);
      for (let vertex = i; vertex < i + 3; vertex++) {
        const u = uvSize
          ? uv.getX(vertex) * uvSize[0]
          : normal === 0
            ? position.getZ(vertex)
            : position.getX(vertex);
        const v = uvSize
          ? uv.getY(vertex) * uvSize[1]
          : normal === 1
            ? position.getZ(vertex)
            : position.getY(vertex);
        side.points.push(u, v);
        side.minU = Math.min(side.minU, u);
        side.maxU = Math.max(side.maxU, u);
        side.minV = Math.min(side.minV, v);
        side.maxV = Math.max(side.maxV, v);
      }
      center.add(a);
    }
    center.divideScalar(position.count / 3);
    for (const [index, side] of sides.entries()) {
      if (!side.triangles.length) continue;
      const axis = Math.floor(index / 2);
      const facing =
        (artworkCameraPosition[axis]! - center.getComponent(axis)) *
        (index % 2 === 0 ? 1 : -1);
      const density = uvSize || facing > 0 ? 106 : 49;
      const usableWidth = Math.max(
        2,
        Math.ceil((side.maxU - side.minU) * density),
      );
      const usableHeight = Math.max(
        2,
        Math.ceil((side.maxV - side.minV) * density),
      );
      const points = side.points.map(
        (value, coordinate) =>
          padding +
          (coordinate % 2 === 0
            ? ((value - side.minU) * usableWidth) / (side.maxU - side.minU || 1)
            : ((value - side.minV) * usableHeight) /
              (side.maxV - side.minV || 1)),
      );
      charts.push({
        surface,
        triangles: side.triangles,
        points,
        x: 0,
        y: 0,
        width: usableWidth + padding * 2,
        height: usableHeight + padding * 2,
      });
    }
  }

  const coordinates = new Map(
    surfaces.map(({ geometry }) => [
      geometry,
      new Float32Array(geometry.getAttribute("position").count * 2),
    ]),
  );
  charts.sort(
    (left, right) => right.height - left.height || right.width - left.width,
  );
  const skyline = new Uint16Array(atlasWidth);
  for (const chart of charts) {
    let bestY = atlasHeight;
    let bestX = 0;
    for (let x = 0; x + chart.width <= atlasWidth; x++) {
      let y = skyline[x]!;
      for (let column = x + 1; column < x + chart.width && y < bestY; column++)
        y = Math.max(y, skyline[column]!);
      if (y >= bestY) continue;
      bestY = y;
      bestX = x;
      if (bestY === 0) break;
    }
    if (bestY + chart.height > atlasHeight)
      throw new Error("The pencil surface charts exceed the workbench atlas");
    chart.x = bestX;
    chart.y = bestY;
    skyline.fill(bestY + chart.height, bestX, bestX + chart.width);
    const uv = coordinates.get(chart.surface.geometry)!;
    for (const [index, first] of chart.triangles.entries()) {
      for (let vertex = 0; vertex < 3; vertex++) {
        const offset = (index * 3 + vertex) * 2;
        uv[(first + vertex) * 2] =
          (chart.x + chart.points[offset]!) / atlasWidth;
        uv[(first + vertex) * 2 + 1] =
          1 - (chart.y + chart.points[offset + 1]!) / atlasHeight;
      }
    }
  }
  for (const [geometry, uv] of coordinates)
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return charts satisfies WorkbenchChart[];
}
