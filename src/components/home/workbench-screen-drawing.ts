import {
  Color,
  DataTexture,
  LinearFilter,
  Matrix3,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";

import type { SurfaceProjection } from "./workbench-atlas";
import type { WorkbenchModel } from "./workbench-model";
import type { WorkbenchDevice } from "./workbench-parts";
import type { BufferGeometry, MeshBasicMaterial, WebGLRenderer } from "three";

type Point = readonly [number, number];
type Stroke = readonly Point[];

function ellipse(
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle = 0,
): Stroke {
  return Array.from({ length: 25 }, (_, index) => {
    const phase = (index * Math.PI) / 12;
    const u = Math.cos(phase) * rx;
    const v = Math.sin(phase) * ry;
    return [
      x + u * Math.cos(angle) - v * Math.sin(angle),
      y + u * Math.sin(angle) + v * Math.cos(angle),
    ];
  });
}

// Coordinates are traced in the two crops of the original workbench drawing.
const drawings = {
  laptop: {
    offset: [666, 394] as Point,
    crop: [0.88, 0.82] as Point,
    strokes: [
      [
        [43, 62],
        [62, 49],
        [78, 54],
      ],
      [
        [43, 62],
        [91, 88],
        [114, 74],
        [105, 69],
      ],
      [
        [43, 62],
        [43, 75],
        [91, 100],
        [115, 85],
        [114, 74],
      ],
      [
        [91, 88],
        [91, 100],
      ],
      [
        [78, 55],
        [77, 48],
        [79, 38],
        [94, 29],
        [113, 38],
        [116, 44],
        [118, 61],
        [106, 70],
      ],
      [
        [79, 38],
        [98, 46],
        [105, 55],
        [106, 70],
        [98, 72],
        [89, 69],
        [82, 62],
        [78, 55],
      ],
      [
        [94, 29],
        [94, 39],
        [108, 46],
        [113, 38],
      ],
      ellipse(93, 55, 7.3, 10.2, -0.44),
      ellipse(92.6, 55.5, 4.4, 6.6, -0.44),
      [
        [94, 45],
        [94, 65],
      ],
      [
        [82, 55],
        [102, 56],
      ],
      [
        [55, 64],
        [70, 55],
        [80, 62],
        [71, 71],
        [55, 64],
      ],
      [
        [48, 72],
        [59, 78],
        [67, 82],
        [76, 87],
        [87, 93],
      ],
      [
        [99, 90],
        [104, 87],
        [109, 83],
      ],
      [
        [55, 41],
        [80, 53],
      ],
      [
        [67, 93],
        [88, 80],
        [114, 66],
      ],
      [
        [138, 16],
        [150, 106],
      ],
      [
        [143, 65],
        [183, 63],
      ],
      [
        [151, 39],
        [169, 39],
      ],
      [
        [159, 23],
        [164, 58],
      ],
      ellipse(162, 40, 7.5, 11.8, -0.25),
      [
        [150, 85],
        [180, 84],
      ],
      [
        [164, 70],
        [171, 100],
      ],
      ellipse(168, 85, 9.4, 12, -0.24),
      [
        [152, 75],
        [179, 97],
      ],
      [
        [154, 95],
        [177, 75],
      ],
    ] as readonly Stroke[],
  },
  display: {
    offset: [977, 374] as Point,
    crop: [0.934, 0.884] as Point,
    strokes: [
      [
        [44, 45],
        [164, 48],
        [162, 87],
        [42, 81],
        [44, 45],
      ],
      [
        [70, 35],
        [66, 94],
      ],
      [
        [122, 36],
        [118, 96],
      ],
      [
        [56, 64],
        [164, 68],
      ],
      [
        [97, 29],
        [92, 102],
      ],
      ellipse(95.4, 65.6, 14.5, 13.2, -0.08),
      ellipse(94.7, 65.3, 11.2, 9.2, -0.08),
      ellipse(94.6, 65.4, 5.1, 4.7, -0.08),
      [
        [69, 57],
        [84, 57],
        [81, 73],
        [68, 72],
      ],
      [
        [108, 57],
        [121, 58],
      ],
      [
        [107, 74],
        [119, 75],
      ],
      [
        [149, 32],
        [145, 101],
      ],
      [
        [136, 49],
        [133, 86],
      ],
      [
        [57, 45],
        [54, 85],
      ],
      [
        [69, 36],
        [123, 38],
      ],
      [
        [65, 92],
        [118, 95],
      ],
      [
        [89, 101],
        [117, 102],
      ],
      [
        [139, 49],
        [137, 98],
      ],
      [
        [162, 65],
        [168, 69],
      ],
      [
        [35, 64],
        [47, 64],
      ],
      [
        [91, 31],
        [101, 32],
      ],
      [
        [90, 89],
        [97, 92],
      ],
      [
        [142, 97],
        [147, 102],
      ],
    ] as readonly Stroke[],
  },
};

// The ink baker maps the four corners projectively. Invert that same map for
// the authored pen paths, so each stroke arrives at its original ink texels.
function paperCoordinates([a, b, c, d]: SurfaceProjection["pixels"]) {
  const dx1 = b[0] - c[0],
    dy1 = b[1] - c[1];
  const dx2 = d[0] - c[0],
    dy2 = d[1] - c[1];
  const dx3 = a[0] - b[0] + c[0] - d[0],
    dy3 = a[1] - b[1] + c[1] - d[1];
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  return new Matrix3()
    .set(
      b[0] * (1 + g) - a[0],
      d[0] * (1 + h) - a[0],
      a[0],
      b[1] * (1 + g) - a[1],
      d[1] * (1 + h) - a[1],
      a[1],
      g,
      h,
      1,
    )
    .invert();
}

function makeArrivalMap(
  device: keyof typeof drawings,
  projection: SurfaceProjection,
  width: number,
  height: number,
) {
  const { offset, crop, strokes } = drawings[device];
  const transform = paperCoordinates(projection.pixels);
  const paths = strokes.map((stroke) =>
    stroke.map(([x, y]) => {
      const p = new Vector3(x + offset[0], y + offset[1], 1).applyMatrix3(
        transform,
      );
      return new Vector2(
        ((p.x / p.z - 0.5) / crop[0] + 0.5) * width,
        ((0.5 - p.y / p.z) / crop[1] + 0.5) * height,
      );
    }),
  );
  const lift = 8;
  const length = paths.reduce(
    (sum, path) =>
      sum +
      lift +
      path
        .slice(1)
        .reduce((total, end, index) => total + end.distanceTo(path[index]!), 0),
    0,
  );
  const times = new Uint8Array(width * height).fill(250);
  const brush = device === "laptop" ? 8.8 : 7.6;
  let walked = 0;
  for (const path of paths) {
    for (const [index, end] of path.slice(1).entries()) {
      const begin = path[index]!;
      const dx = end.x - begin.x,
        dy = end.y - begin.y;
      const size = Math.hypot(dx, dy);
      if (size < 0.001) continue;
      const reach = brush * 2.5;
      const left = Math.max(0, Math.floor(Math.min(begin.x, end.x) - reach));
      const right = Math.min(
        width - 1,
        Math.ceil(Math.max(begin.x, end.x) + reach),
      );
      const bottom = Math.max(0, Math.floor(Math.min(begin.y, end.y) - reach));
      const top = Math.min(
        height - 1,
        Math.ceil(Math.max(begin.y, end.y) + reach),
      );
      for (let y = bottom; y <= top; y++) {
        for (let x = left; x <= right; x++) {
          const px = x + 0.5 - begin.x,
            py = y + 0.5 - begin.y;
          const along = Math.max(
            0,
            Math.min(1, (px * dx + py * dy) / (size * size)),
          );
          const distance = Math.hypot(px - along * dx, py - along * dy);
          const fraction = (walked + along * size) / length;
          const time =
            distance <= brush
              ? 0.022 + fraction * 0.851 + (distance / brush) * 0.012
              : 0.894 + fraction * 0.05 + ((distance - brush) / reach) * 0.082;
          const pixel = y * width + x;
          times[pixel] = Math.min(times[pixel]!, Math.round(time * 255));
        }
      }
      walked += size;
    }
    walked += lift;
  }
  const map = new DataTexture(times, width, height, RedFormat);
  map.magFilter = LinearFilter;
  map.minFilter = LinearFilter;
  map.needsUpdate = true;
  return map;
}

function samplePaper(renderer: WebGLRenderer, source: WebGLRenderTarget) {
  const { width, height } = source;
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(source, 0, 0, width, height, pixels);
  const samples: number[] = [];
  for (let y = Math.floor(height * 0.18); y < height * 0.82; y += 3) {
    for (let x = Math.floor(width * 0.075); x < width * 0.18; x += 3) {
      samples.push((y * width + x) * 4);
    }
  }
  samples.sort((a, b) => pixels[a]! - pixels[b]!);
  const paper = samples[Math.floor(samples.length * 0.64)]!;
  return new Color().setRGB(
    pixels[paper]! / 255,
    pixels[paper + 1]! / 255,
    pixels[paper + 2]! / 255,
  );
}

export function createScreenDrawing(
  device: WorkbenchDevice,
  model: WorkbenchModel,
  renderer: WebGLRenderer,
) {
  const projection = model.screens.get(device)!;
  const { geometry, material: ink } = model.parts.get(`${device}-screen`)!
    .children[0] as Mesh<BufferGeometry, MeshBasicMaterial>;
  const [a, b, c, d] = projection.corners as [
    Vector3,
    Vector3,
    Vector3,
    Vector3,
  ];
  const right = b.clone().sub(a).normalize();
  const up = a.clone().sub(d).normalize();
  const normal = right.clone().cross(up);
  const center = a.clone().lerp(c, 0.5);
  const [cropWidth, cropHeight] = drawings[device].crop;
  const width = a.distanceTo(b) * cropWidth;
  const height = a.distanceTo(d) * cropHeight;
  const frame = new OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0.01,
    4,
  );
  frame.position.copy(center).add(normal);
  frame.up.copy(up);
  frame.lookAt(center);
  const artwork = new Scene();
  artwork.add(new Mesh(geometry, ink));
  const source = new WebGLRenderTarget(432, Math.round((432 * height) / width));
  const previousTarget = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(source);
    renderer.render(artwork, frame);
  } catch (error) {
    source.dispose();
    throw error;
  } finally {
    renderer.setRenderTarget(previousTarget);
  }

  const arrival = makeArrivalMap(
    device,
    projection,
    source.width,
    source.height,
  );
  const material = new ShaderMaterial({
    uniforms: {
      artwork: { value: source.texture },
      arrival: { value: arrival },
      paper: { value: samplePaper(renderer, source) },
      clearInk: { value: 0 },
      progress: { value: 0 },
    },
    vertexShader: `
      varying vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform sampler2D artwork;
      uniform sampler2D arrival;
      uniform vec3 paper;
      uniform float clearInk;
      uniform float progress;
      varying vec2 screenUv;
      void main() {
        vec3 original = texture2D(artwork, screenUv).rgb;
        float grain = fract(sin(dot(floor(screenUv * vec2(436., 251.)), vec2(12.9898, 78.233))) * 43758.5453);
        vec3 blank = paper + (grain - 0.5) * 0.026;
        float pale = smoothstep(paper.r * 0.94, paper.r, original.r);
        blank = mix(blank, original, pale * 0.68);
        float time = texture2D(arrival, screenUv).r;
        float traced = smoothstep(time - 0.012, time + 0.014, progress);
        gl_FragColor = vec4(mix(blank, original, max(1. - clearInk, traced)), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const panel = new Mesh(new PlaneGeometry(width, height), material);
  panel.quaternion.setFromRotationMatrix(
    new Matrix4().makeBasis(right, up, normal),
  );
  panel.position.copy(center).addScaledVector(normal, 0.006);
  panel.visible = false;
  panel.raycast = () => {};
  return {
    panel,
    update(clearInk: number, progress: number) {
      material.uniforms["clearInk"]!.value = clearInk;
      material.uniforms["progress"]!.value = progress;
    },
    dispose() {
      panel.removeFromParent();
      panel.geometry.dispose();
      material.dispose();
      arrival.dispose();
      source.dispose();
    },
  };
}
