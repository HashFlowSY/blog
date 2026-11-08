import {
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Vector2,
} from "three";

import type { BufferGeometry, Texture } from "three";

export type WorkbenchFinish =
  | "wood"
  | "paper"
  | "metal"
  | "dark"
  | "yellow"
  | "leaf"
  | "soil";

const finishes: Record<
  WorkbenchFinish,
  { color: number; face: number; side: number; rear: number; scale: number }
> = {
  wood: { color: 0xfffcf4, face: 0, side: 1, rear: 4, scale: 0.42 },
  paper: { color: 0xffffff, face: 2, side: 2, rear: 5, scale: 0.6 },
  metal: { color: 0xeeeae0, face: 3, side: 3, rear: 3, scale: 1.25 },
  dark: { color: 0xaaa69b, face: 3, side: 3, rear: 3, scale: 1.25 },
  yellow: { color: 0xf3ca32, face: 6, side: 6, rear: 6, scale: 0.7 },
  leaf: { color: 0xd6d6c5, face: 7, side: 7, rear: 7, scale: 1.8 },
  soil: { color: 0x8b8071, face: 1, side: 1, rear: 1, scale: 1.8 },
};

// The same image-made graphite stays attached to the solid on every side.
// Object-space triplanar mapping avoids stretched UVs on merged small parts.
export function createGraphiteMaterial(
  finish: WorkbenchFinish,
  atlas: Texture,
) {
  const { color, face, side, rear, scale } = finishes[finish];
  const material = new MeshLambertMaterial({
    color,
    map: atlas,
    toneMapped: false,
  });
  material.name = `graphite-${finish}`;
  material.customProgramCacheKey = () => `graphite-${finish}-v1`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms["graphiteScale"] = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vGraphitePosition;
        varying vec3 vGraphiteNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vGraphitePosition = position;
        vGraphiteNormal = normal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
        varying vec3 vGraphitePosition;
        varying vec3 vGraphiteNormal;
        uniform float graphiteScale;
        vec3 graphiteTile(vec2 coordinate, float cell) {
          // Mirror within the tile, with a texel gutter for mip filtering.
          vec2 tile = 1.0 - abs(mod(coordinate, 2.0) - 1.0);
          vec2 offset = vec2(mod(cell, 4.0), 1.0 - floor(cell / 4.0));
          return texture2D(map, (offset + 0.006 + tile * 0.988) / vec2(4.0, 2.0)).rgb;
        }`,
      )
      .replace(
        "#include <map_fragment>",
        `vec3 graphiteNormal = normalize(vGraphiteNormal);
        vec3 weights = pow(abs(graphiteNormal), vec3(8.0));
        weights /= max(dot(weights, vec3(1.0)), 0.0001);
        vec3 p = vGraphitePosition * graphiteScale;
        vec3 grain = vec3(0.0);
        if (weights.x > 0.001) grain += graphiteTile(p.zy, ${side.toFixed(1)}) * weights.x;
        if (weights.y > 0.001) grain += graphiteTile(p.zx, ${face.toFixed(1)}) * weights.y;
        if (weights.z > 0.001) grain += graphiteTile(p.xy, graphiteNormal.z < -0.1 ? ${rear.toFixed(1)} : ${face.toFixed(1)}) * weights.z;
        float graphite = 1.0 - dot(grain, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb *= vec3(1.0 - min(graphite * 1.14, 0.8));`,
      )
      .replace(
        "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;",
        `vec3 illumination = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse)
          / max(diffuseColor.rgb, vec3(0.001));
        float lightValue = dot(illumination, vec3(0.2126, 0.7152, 0.0722));
        float shadow = 1.0 - smoothstep(0.38, 1.20, lightValue);
        vec2 hatchCoordinate = weights.x > weights.y && weights.x > weights.z ? p.zy
          : weights.y > weights.z ? p.zx : p.xy;
        float hatchInk = 1.0;
        if (shadow > 0.02) hatchInk = dot(graphiteTile(hatchCoordinate * 1.4, 5.0), vec3(0.2126, 0.7152, 0.0722));
        float pencilShade = mix(0.91, 1.0, 1.0 - shadow);
        vec3 outgoingLight = diffuseColor.rgb * pencilShade * mix(1.0, hatchInk, shadow * 0.85);`,
      );
  };
  return material;
}

type ImagePoint = readonly [number, number];
export type IllustrationQuad = readonly [
  ImagePoint,
  ImagePoint,
  ImagePoint,
  ImagePoint,
];

// Source corners are clockwise from top-left, in the original 1536×1024 art.
// Inverse perspective rectification keeps screen drawings crisp and square.
export function illustrationProjection(quad: IllustrationQuad) {
  const [a, b, c, d] = quad.map(
    ([x, y]) => new Vector2(x / 1536, 1 - y / 1024),
  ) as [Vector2, Vector2, Vector2, Vector2];
  const dx1 = b.x - c.x,
    dx2 = d.x - c.x,
    dy1 = b.y - c.y,
    dy2 = d.y - c.y;
  const sx = a.x - b.x + c.x - d.x,
    sy = a.y - b.y + c.y - d.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g =
    Math.abs(determinant) < 1e-10 ? 0 : (sx * dy2 - dx2 * sy) / determinant;
  const h =
    Math.abs(determinant) < 1e-10 ? 0 : (dx1 * sy - sx * dy1) / determinant;
  return {
    a: b.x - a.x + g * b.x,
    b: d.x - a.x + h * d.x,
    c: a.x,
    d: b.y - a.y + g * b.y,
    e: d.y - a.y + h * d.y,
    f: a.y,
    g,
    h,
  };
}

export function mapIllustration(
  geometry: BufferGeometry,
  quad: IllustrationQuad,
) {
  const { a, b, c, d, e, f, g, h } = illustrationProjection(quad);
  const uv = geometry.getAttribute("uv");
  const coordinates: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i),
      v = 1 - uv.getY(i);
    coordinates.push(a * u + b * v + c, d * u + e * v + f, g * u + h * v + 1);
  }
  geometry.setAttribute("pencilUv", new Float32BufferAttribute(coordinates, 3));
  return geometry;
}

// Homogeneous UVs let independently rectified faces share one texture/draw call.
export function createIllustrationMaterial(source: Texture) {
  const material = new MeshBasicMaterial({
    map: source,
    color: new Color(0xffffff),
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  material.name = "original-pencil-detail";
  material.customProgramCacheKey = () => "original-pencil-detail-v2";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      attribute vec3 pencilUv;
      varying vec3 vPencilUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vPencilUv = pencilUv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vPencilUv;`,
      )
      .replace(
        "#include <map_fragment>",
        "diffuseColor *= texture2D(map, vPencilUv.xy / vPencilUv.z);",
      );
  };
  return material;
}
