import { MeshLambertMaterial } from "three";

import type { Texture } from "three";

const finishes = {
  wood: {
    color: 0xfff7e6,
    face: 0,
    side: 1,
    rear: 4,
    scale: 0.38,
    density: 0.87,
  },
  seat: {
    color: 0xf4e7d7,
    face: 5,
    side: 5,
    rear: 5,
    scale: 0.52,
    density: 0.92,
  },
  paper: {
    color: 0xfff9e9,
    face: 2,
    side: 2,
    rear: 2,
    scale: 0.59,
    density: 0.74,
  },
  pegboard: {
    color: 0xfff7e5,
    face: 2,
    side: 1,
    rear: 4,
    scale: 0.49,
    density: 0.46,
  },
  metal: {
    color: 0xd4cabb,
    face: 3,
    side: 3,
    rear: 3,
    scale: 1.07,
    density: 0.92,
  },
  dark: {
    color: 0xafa38e,
    face: 3,
    side: 3,
    rear: 3,
    scale: 1.23,
    density: 0.94,
  },
  yellow: {
    color: 0xffd906,
    face: 6,
    side: 6,
    rear: 6,
    scale: 0.63,
    density: 0.34,
  },
  leaf: {
    color: 0xccc5a8,
    face: 7,
    side: 7,
    rear: 7,
    scale: 1.52,
    density: 0.82,
  },
  soil: {
    color: 0x8f8270,
    face: 1,
    side: 1,
    rear: 1,
    scale: 1.64,
    density: 0.88,
  },
};

export type WorkbenchFinish = keyof typeof finishes;

// Image-based grain and hatching stay in model space as the camera orbits.
export function createGraphiteMaterial(
  finish: WorkbenchFinish,
  atlas: Texture,
  artwork: Texture,
) {
  const { color, face, side, rear, scale, density } = finishes[finish];
  const material = new MeshLambertMaterial({
    color,
    map: atlas,
    toneMapped: false,
  });
  material.name = `graphite-${finish}`;
  material.customProgramCacheKey = () => `graphite-${finish}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms["graphiteScale"] = { value: scale };
    shader.uniforms["pencilArtwork"] = { value: artwork };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vGraphitePosition;
        varying vec3 vGraphiteNormal;
        attribute vec4 pencilUv;
        varying vec4 vPencilUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vGraphitePosition = position;
        vGraphiteNormal = normal;
        vPencilUv = pencilUv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
        varying vec3 vGraphitePosition;
        varying vec3 vGraphiteNormal;
        varying vec4 vPencilUv;
        uniform sampler2D pencilArtwork;
        uniform float graphiteScale;
        vec3 graphiteTile(vec2 coordinate, vec2 dx, vec2 dy, float cell) {
          // Crossfade the repeat into its centre without reversing the grain.
          vec2 tile = fract(coordinate);
          vec2 blend = 1.0 - smoothstep(vec2(0.0), vec2(0.12), min(tile, 1.0 - tile));
          vec2 offset = vec2(mod(cell, 4.0), 1.0 - floor(cell / 4.0));
          vec2 scale = 0.976 / vec2(4.0, 2.0);
          vec2 origin = (offset + 0.012) / vec2(4.0, 2.0);
          vec2 uv = origin + tile * scale;
          vec2 center = origin + fract(tile + 0.5) * scale;
          vec2 gx = dx * scale;
          vec2 gy = dy * scale;
          vec3 sampleInk = textureGrad(map, uv, gx, gy).rgb;
          if (blend.x > 0.0) {
            vec3 across = textureGrad(map, vec2(center.x, uv.y), gx, gy).rgb;
            sampleInk = mix(sampleInk, across, blend.x);
          }
          if (blend.y > 0.0) {
            vec3 nextRow = textureGrad(map, vec2(uv.x, center.y), gx, gy).rgb;
            if (blend.x > 0.0) {
              vec3 across = textureGrad(map, center, gx, gy).rgb;
              nextRow = mix(nextRow, across, blend.x);
            }
            sampleInk = mix(sampleInk, nextRow, blend.y);
          }
          return sampleInk;
        }
        float graphiteShade(vec2 coordinate, vec2 dx, vec2 dy, float shadow) {
          float pressure = 0.70 + 0.17 * sin(dot(coordinate, vec2(4.7, 7.3)))
            + 0.09 * cos(dot(coordinate, vec2(-11.2, 8.9)));
          mat2 turn = mat2(0.93, 0.37, -0.37, 0.93);
          vec2 scale = vec2(1.13, 1.70);
          vec2 marks = (turn * coordinate) * scale + vec2(0.32, 0.81);
          vec3 hatch = graphiteTile(marks, (turn * dx) * scale, (turn * dy) * scale, 5.0);
          float ink = dot(hatch, vec3(0.2126, 0.7152, 0.0722));
          return mix(1.0, 0.86, shadow * pressure) * mix(1.0, ink, shadow * pressure);
        }`,
      )
      .replace(
        "#include <map_fragment>",
        `vec3 graphiteNormal = normalize(vGraphiteNormal);
        vec3 weights = pow(abs(graphiteNormal), vec3(8.0));
        weights /= max(dot(weights, vec3(1.0)), 0.0001);
        vec3 p = vGraphitePosition * graphiteScale;
        vec3 dx = dFdx(p);
        vec3 dy = dFdy(p);
        vec3 grain = vec3(0.0);
        if (weights.x > 0.001) grain += graphiteTile(p.zy, dx.zy, dy.zy, ${side.toFixed(1)}) * weights.x;
        if (weights.y > 0.001) grain += graphiteTile(p.xz, dx.xz, dy.xz, ${face.toFixed(1)}) * weights.y;
        if (weights.z > 0.001) grain += graphiteTile(p.xy, dx.xy, dy.xy, graphiteNormal.z < -0.1 ? ${rear.toFixed(1)} : ${face.toFixed(1)}) * weights.z;
        float graphite = 1.0 - dot(grain, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb *= vec3(1.0 - min(graphite * ${density.toFixed(2)}, 0.72));`,
      )
      .replace(
        "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;",
        `vec3 illumination = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse)
          / max(diffuseColor.rgb, vec3(0.001));
        float lightValue = dot(illumination, vec3(0.2126, 0.7152, 0.0722));
        float shadow = 1.0 - smoothstep(0.27, 1.34, lightValue);
        float pencilShade = 1.0;
        if (shadow > 0.02) {
          vec3 shade = vec3(1.0);
          if (weights.x > 0.001) shade.x = graphiteShade(p.zy, dx.zy, dy.zy, shadow);
          if (weights.y > 0.001) shade.y = graphiteShade(p.xz, dx.xz, dy.xz, shadow);
          if (weights.z > 0.001) shade.z = graphiteShade(p.xy, dx.xy, dy.xy, shadow);
          pencilShade = dot(shade, weights);
        }
        vec3 outgoingLight = diffuseColor.rgb * pencilShade;
        if (vPencilUv.w > 0.5) {
          vec4 sourceInk = texture2D(pencilArtwork, vPencilUv.xy / vPencilUv.z);
          outgoingLight = mix(outgoingLight, sourceInk.rgb, sourceInk.a);
        }`,
      );
  };
  return material;
}
