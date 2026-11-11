import { Matrix4, PerspectiveCamera, Vector2, Vector3, Vector4 } from "three";

export const artworkWidth = 1536;
export const artworkHeight = 1024;

const artworkCenter = [930.25, 480.99] as const;
export const orbitTarget = [0.25, 3.68, 0.3] as const;

export function setArtworkView(
  camera: PerspectiveCamera,
  width: number,
  height: number,
  scale: number,
  left: number,
  top: number,
) {
  camera.setViewOffset(
    artworkWidth,
    artworkHeight,
    artworkWidth / 2 - artworkCenter[0] - left / scale,
    artworkHeight / 2 - artworkCenter[1] - top / scale,
    width / scale,
    height / scale,
  );
}

export function createArtworkCamera() {
  const camera = new PerspectiveCamera(
    29.18,
    artworkWidth / artworkHeight,
    0.1,
    80,
  );
  camera.position.set(8.382, 5.981, 17.176);
  camera.lookAt(...orbitTarget);
  camera.updateMatrixWorld();
  setArtworkView(camera, artworkWidth, artworkHeight, 1, 0, 0);
  return camera;
}

const referenceCamera = createArtworkCamera();
const modelToArtwork = new Matrix4().multiplyMatrices(
  referenceCamera.projectionMatrix,
  referenceCamera.matrixWorldInverse,
);
const artworkToModel = modelToArtwork.clone().invert();

export type ArtworkPoint = readonly [number, number];

// A pixel in the fixed reference view defines a ray. Intersect it with the
// physical face so the original drawing and that face share the same outline.
export function artworkPoint(
  [x, y]: ArtworkPoint,
  axis: "x" | "y" | "z",
  coordinate: number,
) {
  const near = new Vector3(
    (x / artworkWidth) * 2 - 1,
    1 - (y / artworkHeight) * 2,
    -1,
  );
  const far = near.clone();
  far.z = 1;
  near.applyMatrix4(artworkToModel);
  far.applyMatrix4(artworkToModel);
  return near.lerp(far, (coordinate - near[axis]) / (far[axis] - near[axis]));
}

export function artworkUv(point: Vector3, target: Vector4) {
  target.set(point.x, point.y, point.z, 1).applyMatrix4(modelToArtwork);
  return [
    (target.x + target.w) / 2,
    (target.y + target.w) / 2,
    target.w,
  ] as const;
}

export function calibrateArtworkQuad(
  corners: readonly [Vector3, Vector3, Vector3, Vector3],
) {
  const clip = new Vector4();
  const projected = (point: Vector3) => {
    const [x, y, w] = artworkUv(point, clip);
    return new Vector3(x / w, y / w, w);
  };
  const [a, b, c, d] = [
    projected(corners[0]),
    projected(corners[1]),
    projected(corners[2]),
    projected(corners[3]),
  ];
  const ac = new Vector2(c.x - a.x, c.y - a.y);
  const bd = new Vector2(d.x - b.x, d.y - b.y);
  const ab = new Vector2(b.x - a.x, b.y - a.y);
  const determinant = ac.cross(bd);
  const t = ab.cross(bd) / determinant;
  const s = ab.cross(ac) / determinant;

  // Move the source points along their reference rays, keeping the same image
  // corners. Both diagonals of the rectangular mesh then sample the same point.
  const depth = (a.z + b.z + c.z + d.z) / 2;
  const weights = [(1 - t) / a.z, (1 - s) / b.z, t / c.z, s / d.z];
  return corners.map((point, index) =>
    referenceCamera.position.clone().lerp(point, depth * weights[index]!),
  );
}
