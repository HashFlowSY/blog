import { Matrix4, PerspectiveCamera, Vector3 } from "three";

export const artworkWidth = 1536;
export const artworkHeight = 1024;

const artworkCenter = [930.25, 480.99] as const;
export const artworkCameraPosition = [8.382, 5.981, 17.176] as const;
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
  camera.position.set(...artworkCameraPosition);
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
