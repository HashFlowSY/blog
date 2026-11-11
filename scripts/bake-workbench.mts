import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EdgesGeometry, Matrix3, Matrix4, Vector3, Vector4 } from "three";

import type {
  ArtworkLayer,
  ArtworkRegion,
  WorkbenchChart,
  WorkbenchSurface,
} from "../src/components/home/workbench-atlas";
import type * as AtlasModule from "../src/components/home/workbench-atlas";
import type * as MaterialsModule from "../src/components/home/workbench-materials";
import type * as ModelModule from "../src/components/home/workbench-model";
import type * as ViewModule from "../src/components/home/workbench-view";

// Node's authoring entry point uses the same extensionless modules as Next.
registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier.startsWith("./workbench-") && !extname(specifier)
        ? `${specifier}.ts`
        : specifier,
      context,
    );
  },
});

const model = (await import(
  new URL("../src/components/home/workbench-model.ts", import.meta.url).href
)) as typeof ModelModule;
const atlas = (await import(
  new URL("../src/components/home/workbench-atlas.ts", import.meta.url).href
)) as typeof AtlasModule;
const view = (await import(
  new URL("../src/components/home/workbench-view.ts", import.meta.url).href
)) as typeof ViewModule;
const { workbenchFinishes } = (await import(
  new URL("../src/components/home/workbench-materials.ts", import.meta.url).href
)) as typeof MaterialsModule;

const { atlasWidth, atlasHeight, artworkLayers } = atlas;
const { artworkWidth, artworkHeight } = view;
const layers = ["tools", "foundation", "surface"] as const;
const sourceDirectory = fileURLToPath(
  new URL("../docs/design/workbench-source/", import.meta.url),
);
const outputDirectory = fileURLToPath(
  new URL("../public/assets/", import.meta.url),
);
const scratch = mkdtempSync(join(outputDirectory, ".workbench-bake-"));
const exports: string[] = [];
process.once("exit", () => rmSync(scratch, { recursive: true, force: true }));

type Point = readonly [number, number];
type Color = [number, number, number];
type Triangle<T> = readonly [T, T, T];
interface Image {
  width: number;
  height: number;
  pixels: Uint8Array;
}

function readWebp(name: string): Image {
  const data = execFileSync(
    "dwebp",
    [join(sourceDirectory, name), "-quiet", "-pam", "-o", "-"],
    {
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const end = data.indexOf("ENDHDR\n") + 7;
  const header = data.toString("ascii", 0, end);
  const width = Number(header.match(/\bWIDTH (\d+)/)?.[1]);
  const height = Number(header.match(/\bHEIGHT (\d+)/)?.[1]);
  const pixels = data.subarray(end);
  if (!width || !height || pixels.length !== width * height * 4)
    throw new Error(`Invalid artwork image ${name}`);
  return { width, height, pixels };
}

function writeWebp(name: string, image: Image) {
  const path = join(scratch, `${name}.pam`);
  const { width, height, pixels } = image;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from(
        `P7\nWIDTH ${width}\nHEIGHT ${height}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n`,
      ),
      pixels,
    ]),
  );
  const file = `${name}.webp`;
  execFileSync("cwebp", [
    "-quiet",
    "-lossless",
    "-z",
    "5",
    path,
    "-o",
    join(scratch, file),
  ]);
  exports.push(file);
}

function image(width: number, height: number): Image {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

const source = Object.fromEntries(
  layers.map((layer) => [layer, readWebp(`workbench-${layer}.webp`)]),
) as Record<ArtworkLayer, Image>;
const graphite = readWebp("workbench-graphite-atlas.webp");
const regions = Object.keys(artworkLayers) as ArtworkRegion[];
const regionIndex = new Map(regions.map((region, i) => [region, i + 1]));

function box(x: number, y: number, width: number, height: number): Point[] {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}

// Source mattes mark foreground ownership even where a hand-drawn edge falls
// a few pixels away from the corresponding solid.
const mattes: Partial<Record<ArtworkRegion, Point[][]>> = {
  boardHardware: [
    [
      [811, 253],
      [1061, 247],
      [1086, 257],
      [1085, 278],
      [810, 287],
    ],
    [
      [624, 246],
      [704, 263],
      [702, 344],
      [681, 344],
    ],
    [
      [1307, 236],
      [1373, 245],
      [1353, 355],
      [1338, 355],
    ],
    box(715, 324, 92, 126),
    box(814, 329, 47, 133),
    box(877, 332, 116, 139),
    box(1001, 333, 79, 124),
    [
      [1127, 340],
      [1214, 333],
      [1232, 377],
      [1214, 437],
      [1137, 438],
    ],
    [
      [1240, 337],
      [1312, 336],
      [1329, 412],
      [1333, 545],
      [1307, 545],
      [1281, 480],
      [1249, 517],
    ],
  ],
  cabinet: [
    [
      [994, 593],
      [1221, 618],
      [1222, 894],
      [991, 847],
    ],
    [
      [1255, 596],
      [1337, 551],
      [1335, 786],
      [1256, 854],
    ],
  ],
  case: [
    [
      [584, 642],
      [627, 621],
      [694, 616],
      [773, 631],
      [780, 676],
      [771, 705],
      [716, 731],
      [585, 714],
    ],
  ],
  deskTools: [
    [
      [895, 548],
      [971, 529],
      [984, 530],
      [987, 541],
      [918, 557],
      [897, 557],
    ],
    [
      [978, 546],
      [1007, 537],
      [1100, 545],
      [1100, 552],
      [1073, 564],
      [978, 557],
    ],
    [
      [1106, 558],
      [1121, 545],
      [1143, 544],
      [1156, 554],
      [1148, 567],
      [1106, 567],
    ],
  ],
  display: [
    [
      [986, 375],
      [1191, 377],
      [1182, 505],
      [1118, 505],
      [1118, 517],
      [1146, 521],
      [1146, 532],
      [1116, 541],
      [1037, 532],
      [1037, 525],
      [1079, 516],
      [1081, 501],
      [974, 496],
    ],
  ],
  laptop: [
    [
      [665, 395],
      [853, 392],
      [873, 505],
      [922, 526],
      [924, 537],
      [725, 549],
      [682, 535],
    ],
  ],
  shelf: [
    [
      [609, 229],
      [1318, 210],
      [1385, 223],
      [1385, 244],
      [1324, 244],
      [615, 259],
    ],
  ],
  shelfObjects: [
    [
      [631, 43],
      [818, 45],
      [816, 172],
      [974, 163],
      [974, 226],
      [648, 232],
    ],
    [
      [1096, 94],
      [1230, 92],
      [1229, 125],
      [1357, 128],
      [1367, 225],
      [1095, 223],
    ],
  ],
  stool: [
    [
      [751, 704],
      [758, 686],
      [792, 675],
      [835, 672],
      [878, 679],
      [899, 692],
      [905, 707],
      [897, 723],
      [873, 733],
      [810, 738],
      [771, 728],
      [757, 719],
    ],
    [
      [802, 727],
      [864, 727],
      [877, 796],
      [924, 806],
      [923, 854],
      [941, 914],
      [910, 931],
      [858, 907],
      [856, 957],
      [816, 956],
      [810, 908],
      [711, 925],
      [704, 898],
      [753, 862],
      [729, 843],
      [733, 810],
      [799, 795],
    ],
  ],
  vise: [
    [
      [1207, 475],
      [1278, 475],
      [1299, 513],
      [1299, 565],
      [1276, 585],
      [1203, 587],
      [1203, 554],
      [1209, 541],
    ],
  ],
};

function inside(shape: readonly Point[], x: number, y: number) {
  let enclosed = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [ax, ay] = shape[i]!;
    const [bx, by] = shape[j]!;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      enclosed = !enclosed;
  }
  return enclosed;
}

const owners = {
  tools: new Uint8Array(artworkWidth * artworkHeight).fill(
    regionIndex.get("board")!,
  ),
  foundation: new Uint8Array(artworkWidth * artworkHeight).fill(
    regionIndex.get("frame")!,
  ),
  surface: new Uint8Array(artworkWidth * artworkHeight).fill(
    regionIndex.get("desk")!,
  ),
};
for (const region of [
  "boardHardware",
  "cabinet",
  "case",
  "deskTools",
  "display",
  "laptop",
  "shelfObjects",
  "shelf",
  "stool",
  "vise",
] as const) {
  for (const shape of mattes[region]!) {
    const xs = shape.map(([x]) => x);
    const ys = shape.map(([, y]) => y);
    const mask = owners[artworkLayers[region]];
    for (let y = Math.min(...ys); y < Math.max(...ys); y++)
      for (let x = Math.min(...xs); x < Math.max(...xs); x++)
        if (inside(shape, x + 0.5, y + 0.5))
          mask[y * artworkWidth + x] = regionIndex.get(region)!;
  }
}

interface Vertex {
  point: Vector3;
  normal: Vector3;
  uv: Point;
  reference: Point;
  distance: number;
}
interface Face {
  vertices: Triangle<Vertex>;
  edgeDistances: Triangle<number>;
  surface: WorkbenchSurface;
}

const surfaces = model.buildWorkbenchSurfaces();
const charts = atlas.layoutWorkbenchAtlas(surfaces);
const camera = view.createArtworkCamera();
const matrix = new Matrix4().multiplyMatrices(
  camera.projectionMatrix,
  camera.matrixWorldInverse,
);
const clip = new Vector4();

function reference(point: Vector3) {
  clip.set(point.x, point.y, point.z, 1).applyMatrix4(matrix);
  return {
    reference: [
      ((1 + clip.x / clip.w) * artworkWidth) / 2,
      ((1 - clip.y / clip.w) * artworkHeight) / 2,
    ] as const,
    distance: clip.w,
  };
}

function quadMatrix(points: readonly Point[]) {
  const [a, b, c, d] = points;
  if (!a || !b || !c || !d)
    throw new Error("A painted face needs four corners");
  const [dx1, dy1] = [b[0] - c[0], b[1] - c[1]];
  const [dx2, dy2] = [d[0] - c[0], d[1] - c[1]];
  const [dx3, dy3] = [a[0] - b[0] + c[0] - d[0], a[1] - b[1] + c[1] - d[1]];
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  return new Matrix3().set(
    b[0] * (1 + g) - a[0],
    d[0] * (1 + h) - a[0],
    a[0],
    b[1] * (1 + g) - a[1],
    d[1] * (1 + h) - a[1],
    a[1],
    g,
    h,
    1,
  );
}

const paintCoordinates = new Map<WorkbenchSurface, Matrix3>();
for (const surface of surfaces) {
  if (!surface.projection) continue;
  const { corners, pixels } = surface.projection;
  const projected = quadMatrix(
    corners.map((point) => reference(point).reference),
  );
  const remap = quadMatrix(pixels).multiply(projected.invert());
  if (remap.elements.some((value) => !Number.isFinite(value)))
    throw new Error(`Invalid pencil projection on ${surface.region}`);
  paintCoordinates.set(surface, remap);
}

function edgeKey(a: Vector3, b: Vector3) {
  const point = (p: Vector3) =>
    p
      .toArray()
      .map((v) => Math.round(v * 10000))
      .join(",");
  return [point(a), point(b)].sort().join("/");
}

function facesForCharts(chartsToRender: readonly WorkbenchChart[]) {
  const edges = new Map<WorkbenchSurface, Set<string>>();
  for (const surface of surfaces) {
    const sharp = new Set<string>();
    if (surface.outline) {
      const lines = new EdgesGeometry(surface.geometry, 34);
      const position = lines.getAttribute("position");
      const a = new Vector3(),
        b = new Vector3();
      for (let i = 0; i < position.count; i += 2)
        sharp.add(
          edgeKey(
            a.fromBufferAttribute(position, i),
            b.fromBufferAttribute(position, i + 1),
          ),
        );
      lines.dispose();
    }
    edges.set(surface, sharp);
  }
  return chartsToRender.map((chart) => {
    const { surface } = chart;
    const geometry = surface.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    const sharp = edges.get(surface)!;
    return chart.triangles.map((first): Face => {
      const vertex = (i: number): Vertex => {
        const index = first + i;
        const point = new Vector3().fromBufferAttribute(position, index);
        return {
          point,
          normal: new Vector3().fromBufferAttribute(normal, index),
          uv: [uv.getX(index) * atlasWidth, (1 - uv.getY(index)) * atlasHeight],
          ...reference(point),
        };
      };
      const vertices = [vertex(0), vertex(1), vertex(2)] as const;
      const [a, b, c] = vertices.map((v) => v.point);
      const area = b!.clone().sub(a!).cross(c!.clone().sub(a!)).length();
      const altitude = (a: Vector3, b: Vector3) =>
        sharp.has(edgeKey(a, b)) ? area / a.distanceTo(b) : 1e6;
      return {
        vertices,
        edgeDistances: [altitude(b!, c!), altitude(c!, a!), altitude(a!, b!)],
        surface,
      };
    });
  });
}

const chartFaces = facesForCharts(charts);
const faces = chartFaces.flat();

function rasterize(
  [[ax, ay], [bx, by], [cx, cy]]: Triangle<Point>,
  width: number,
  height: number,
  fragment: (index: number, a: number, b: number, c: number) => void,
  frontOnly = false,
) {
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-10 || (frontOnly && area > 0)) return;
  const xStart = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5));
  const xEnd = Math.min(width - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
  const yStart = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5));
  const yEnd = Math.min(height - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
  for (let y = yStart; y <= yEnd; y++) {
    const dy = y + 0.5 - ay;
    for (let x = xStart; x <= xEnd; x++) {
      const dx = x + 0.5 - ax;
      const b = (dx * (cy - ay) - dy * (cx - ax)) / area;
      const c = ((bx - ax) * dy - (by - ay) * dx) / area;
      const a = 1 - b - c;
      if (a >= -1e-7 && b >= -1e-7 && c >= -1e-7)
        fragment(y * width + x, a, b, c);
    }
  }
}

function projectFaces(
  scale: number,
  paint: (
    face: Face,
    index: number,
    a: number,
    b: number,
    c: number,
    distance: number,
  ) => void,
) {
  const width = artworkWidth * scale;
  const height = artworkHeight * scale;
  const depth = new Float32Array(width * height).fill(Infinity);
  for (const face of faces) {
    const [a, b, c] = face.vertices;
    const xy = ({ reference: [x, y] }: Vertex) =>
      [x * scale, y * scale] as const;
    rasterize(
      [xy(a), xy(b), xy(c)],
      width,
      height,
      (i, u, v, w) => {
        const reciprocal = u / a.distance + v / b.distance + w / c.distance;
        const distance = 1 / reciprocal;
        if (distance >= depth[i]!) return;
        depth[i] = distance;
        paint(
          face,
          i,
          (u / a.distance) * distance,
          (v / b.distance) * distance,
          (w / c.distance) * distance,
          distance,
        );
      },
      true,
    );
  }
  return depth;
}

const surfaceIds = new Map(
  surfaces.map((surface, index) => [surface, index + 1]),
);
const visible = new Uint16Array(artworkWidth * artworkHeight);
const referenceDepth = projectFaces(1, (face, index) => {
  visible[index] = surfaceIds.get(face.surface)!;
});

function blend(from: number, to: number, alpha: number) {
  return from + (to - from) * alpha;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(min: number, max: number, value: number) {
  const t = clamp((value - min) / (max - min));
  return t * t * (3 - 2 * t);
}

function sample(img: Image, x: number, y: number, channel: number) {
  const left = Math.floor(clamp(x - 0.5, 0, img.width - 1));
  const top = Math.floor(clamp(y - 0.5, 0, img.height - 1));
  const right = Math.min(left + 1, img.width - 1);
  const bottom = Math.min(top + 1, img.height - 1);
  const u = clamp(x - 0.5 - left);
  const v = clamp(y - 0.5 - top);
  const pixels = img.pixels;
  const first = blend(
    pixels[(top * img.width + left) * 4 + channel]!,
    pixels[(top * img.width + right) * 4 + channel]!,
    u,
  );
  const second = blend(
    pixels[(bottom * img.width + left) * 4 + channel]!,
    pixels[(bottom * img.width + right) * 4 + channel]!,
    u,
  );
  return blend(first, second, v);
}

// Read the original wash through a neighborhood average with the drawn
// hardware and small dark perforation marks removed. The mesh supplies holes.
function boardWash() {
  const original = source.tools;
  const left = 705,
    top = 253,
    width = 625,
    height = 322;
  const stride = width + 1;
  const count = new Uint32Array(stride * (height + 1));
  const sums = Array.from({ length: 3 }, () => new Uint32Array(count.length));
  const board = regionIndex.get("board");
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const index = (top + y - 1) * artworkWidth + left + x - 1;
      const rgba = index * 4;
      const local = y * stride + x;
      const valid =
        owners.tools[index] === board &&
        original.pixels[rgba + 3]! > 215 &&
        original.pixels[rgba]! > 151;
      count[local] =
        count[local - 1]! +
        count[local - stride]! -
        count[local - stride - 1]! +
        Number(valid);
      for (const [channel, sum] of sums.entries())
        sum[local] =
          sum[local - 1]! +
          sum[local - stride]! -
          sum[local - stride - 1]! +
          (valid ? original.pixels[rgba + channel]! : 0);
    }
  }
  return (px: number, py: number): Color => {
    const x = clamp(Math.floor(px) - left, 0, width - 1);
    const y = clamp(Math.floor(py) - top, 0, height - 1);
    for (const radius of [18, 38, 76]) {
      const x0 = Math.max(0, x - radius),
        x1 = Math.min(width, x + radius);
      const y0 = Math.max(0, y - radius),
        y1 = Math.min(height, y + radius);
      const total = (values: Uint32Array) =>
        values[y1 * stride + x1]! -
        values[y1 * stride + x0]! -
        values[y0 * stride + x1]! +
        values[y0 * stride + x0]!;
      const area = total(count);
      if (area >= 40) return sums.map((sum) => total(sum) / area) as Color;
    }
    return [236, 227, 205];
  };
}

const sampleBoardWash = boardWash();

function grain(u: number, v: number, tile: number) {
  const width = graphite.width / 4,
    height = graphite.height / 2;
  const x = (tile % 4) * width + 6;
  const y = Math.floor(tile / 4) * height + 6;
  const sampleTile = (u: number, v: number) =>
    sample(graphite, x + u * (width - 12), y + v * (height - 12), 0) / 255;
  const s = u - Math.floor(u),
    t = v - Math.floor(v);
  const fadeX = 1 - smooth(0, 0.1, Math.min(s, 1 - s));
  const fadeY = 1 - smooth(0, 0.1, Math.min(t, 1 - t));
  const across = (s + 0.5) % 1,
    down = (t + 0.5) % 1;
  const row = blend(sampleTile(s, t), sampleTile(across, t), fadeX);
  return fadeY > 0
    ? blend(
        row,
        blend(sampleTile(s, down), sampleTile(across, down), fadeX),
        fadeY,
      )
    : row;
}

const key = new Vector3(-0.44, 0.84, 0.55).normalize();
const world = new Vector3(),
  normal = new Vector3(),
  ray = new Vector3(),
  paintPoint = new Vector3();
function pencilFinish(face: Face, a: number, b: number, c: number): Color {
  const finish = workbenchFinishes[face.surface.finish];
  const [first, second, third] = face.vertices;
  world
    .copy(first.point)
    .multiplyScalar(a)
    .addScaledVector(second.point, b)
    .addScaledVector(third.point, c);
  normal
    .copy(first.normal)
    .multiplyScalar(a)
    .addScaledVector(second.normal, b)
    .addScaledVector(third.normal, c)
    .normalize();
  const { x, y, z } = world;
  const weights = normal.toArray().map((value) => Math.abs(value) ** 8);
  const sum = weights[0]! + weights[1]! + weights[2]!;
  const scale = finish.scale;
  const grainValue =
    (weights[0]! * grain(z * scale, y * scale, finish.side) +
      weights[1]! * grain(x * scale, z * scale, finish.face) +
      weights[2]! *
        grain(x * scale, y * scale, normal.z < 0 ? finish.rear : finish.face)) /
    (sum || 1);
  const light = clamp(normal.dot(key) * 0.55 + 0.5);
  const hatch = grain((x + z * 0.38) * 0.54, (y + z - x * 0.27) * 0.71, 5);
  const [edgeA, edgeB, edgeC] = face.edgeDistances;
  const edge = Math.min(a * edgeA, b * edgeB, c * edgeC);
  const stroke = (1 - smooth(0.002, 0.016, edge)) * (0.29 + (1 - hatch) * 0.16);
  const shade =
    (0.8 + light * 0.2) *
    (1 - (1 - grainValue) * finish.density * 0.78) *
    (1 - (1 - hatch) * (1 - light) * 0.42) *
    (1 - stroke);
  const color: Color = [
    finish.color >> 16,
    (finish.color >> 8) & 255,
    finish.color & 255,
  ];
  const base = color.map((value) => value * shade) as Color;

  ray.copy(camera.position).sub(world).normalize();
  const facing = normal.dot(ray);
  if (facing <= 0.025) return base;
  const {
    reference: [screenX, screenY],
    distance,
  } = reference(world);
  const { region, finish: material } = face.surface;
  if (material === "pegboard" && normal.z > 0.9) {
    const board = sampleBoardWash(screenX, screenY);
    const graphiteShade = 1 - (1 - grainValue) * 0.31;
    return board.map((value) => value * graphiteShade) as Color;
  }
  if (region === "stool" && material !== "seat" && world.y < 1.14) return base;

  const sx = Math.floor(screenX),
    sy = Math.floor(screenY);
  if (sx < 1 || sy < 1 || sx >= artworkWidth - 1 || sy >= artworkHeight - 1)
    return base;
  const projectedIndex = sy * artworkWidth + sx;
  const surfaceId = surfaceIds.get(face.surface)!;
  if (
    visible[projectedIndex] !== surfaceId ||
    Math.abs(referenceDepth[projectedIndex]! - distance) > 0.09
  )
    return base;
  let px = screenX,
    py = screenY;
  const remap = paintCoordinates.get(face.surface);
  if (remap) {
    paintPoint.set(px, py, 1).applyMatrix3(remap);
    px = paintPoint.x / paintPoint.z;
    py = paintPoint.y / paintPoint.z;
  }
  const ix = Math.floor(px),
    iy = Math.floor(py);
  if (ix < 1 || iy < 1 || ix >= artworkWidth - 1 || iy >= artworkHeight - 1)
    return base;
  const layer = artworkLayers[region];
  const original = source[layer];
  const index = iy * artworkWidth + ix;
  const id = regionIndex.get(region)!;
  const matte = owners[layer];
  if (matte[index] !== id) return base;
  const red = sample(original, px, py, 0);
  const green = sample(original, px, py, 1);
  const blue = sample(original, px, py, 2);
  if (material === "yellow" && red - blue < 85) return base;
  const coverage =
    [index - 1, index + 1, index - artworkWidth, index + artworkWidth].filter(
      (neighbor) => matte[neighbor] === id,
    ).length / 4;
  // The source was drawn from near the plane of the tabletop. Its edge and
  // contact strokes stretch when viewed from above, so retain the tonal wash
  // there and use surface-scale pencil grain for the fine strokes.
  const upward = normal.y > 0.68 && material !== "seat";
  const transfer = upward
    ? smooth(0.17, 0.46, facing) * smooth(130, 205, red)
    : smooth(0.025, 0.105, facing);
  const weight =
    smooth(135, 246, sample(original, px, py, 3)) * transfer * coverage;
  return [
    blend(base[0], red, weight),
    blend(base[1], green, weight),
    blend(base[2], blue, weight),
  ];
}

const baked = image(atlasWidth, atlasHeight);
for (const [index, chart] of charts.entries()) {
  const pixels = chartFaces[index]!;
  for (const face of pixels) {
    const [a, b, c] = face.vertices;
    rasterize([a.uv, b.uv, c.uv], atlasWidth, atlasHeight, (pixel, u, v, w) => {
      baked.pixels.set([...pencilFinish(face, u, v, w), 255], pixel * 4);
    });
  }

  // Extend border texels into the chart padding for filtered and minified views.
  const { x, y, width, height } = chart;
  const queue = new Uint32Array(width * height);
  let tail = 0;
  const offset = (point: number) =>
    ((y + Math.floor(point / width)) * atlasWidth + x + (point % width)) * 4;
  for (let pixel = 0; pixel < queue.length; pixel++)
    if (baked.pixels[offset(pixel) + 3]) queue[tail++] = pixel;
  for (let head = 0; head < tail; head++) {
    const pixel = queue[head]!;
    const from = offset(pixel);
    const column = pixel % width;
    const neighbors = [
      column > 0 ? pixel - 1 : -1,
      column + 1 < width ? pixel + 1 : -1,
      pixel - width,
      pixel + width,
    ];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || neighbor >= queue.length) continue;
      const to = offset(neighbor);
      if (baked.pixels[to + 3]) continue;
      baked.pixels.copyWithin(to, from, from + 4);
      queue[tail++] = neighbor;
    }
  }
}
writeWebp("workbench-ink-atlas", baked);

// Render the same textured geometry in the same camera. Assign antialiased
// edge pixels to the nearest visible layer so the SVG reveal stays additive.
const scale = 2;
const supersampled = image(artworkWidth * scale, artworkHeight * scale);
const layerIds = new Uint8Array(supersampled.width * supersampled.height);
projectFaces(scale, (face, index, a, b, c) => {
  const [first, second, third] = face.vertices;
  const u = first.uv[0] * a + second.uv[0] * b + third.uv[0] * c;
  const v = first.uv[1] * a + second.uv[1] * b + third.uv[1] * c;
  const offset = index * 4;
  for (let channel = 0; channel < 3; channel++)
    supersampled.pixels[offset + channel] = sample(baked, u, v, channel);
  layerIds[index] = layers.indexOf(artworkLayers[face.surface.region]) + 1;
});

const stills = layers.map(() => image(artworkWidth, artworkHeight));
for (let y = 0; y < artworkHeight; y++) {
  for (let x = 0; x < artworkWidth; x++) {
    const colors = [0, 0, 0];
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const pixel = (y * scale + dy) * supersampled.width + x * scale + dx;
        const layer = layerIds[pixel]!;
        if (!layer) continue;
        counts[layer]!++;
        total++;
        for (let channel = 0; channel < 3; channel++)
          colors[channel]! += supersampled.pixels[pixel * 4 + channel]!;
      }
    }
    if (total === 0) continue;
    const layer = counts.indexOf(Math.max(...counts)) - 1;
    stills[layer]!.pixels.set(
      [
        ...colors.map((value) => Math.round(value / total)),
        Math.round((total * 255) / (scale * scale)),
      ],
      (y * artworkWidth + x) * 4,
    );
  }
}
for (const [index, layer] of layers.entries())
  writeWebp(`workbench-${layer}`, stills[index]!);
surfaces.forEach(({ geometry }) => geometry.dispose());
for (const file of exports)
  renameSync(join(scratch, file), join(outputDirectory, file));
