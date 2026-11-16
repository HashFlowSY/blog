import { assetPath } from "@/lib/site";

import { workbenchLeaves } from "./workbench-parts";

import type {
  WorkbenchDevice,
  WorkbenchLeaf,
  WorkbenchPart,
} from "./workbench-parts";

const workbenchArtRoot = "/assets/workbench-2d";
export const workbenchDrawingArt = {
  rest: assetPath(`${workbenchArtRoot}/workbench-rest.webp`),
  paper: assetPath(`${workbenchArtRoot}/workbench-paper.webp`),
  pencil: assetPath("/assets/drawing-pencil.webp"),
} as const;

export const workbenchSheet = {
  width: 1440,
  height: 900,
  top: 82,
  sceneHeight: 682,
} as const;

type WorkbenchArtBox = readonly [number, number, number, number];
type WorkbenchArtPoint = readonly [number, number];

export interface WorkbenchArtImage {
  readonly src: string;
  readonly box: WorkbenchArtBox;
}

interface WorkbenchHotspot {
  readonly hit: WorkbenchArtBox;
  readonly anchor?: WorkbenchArtPoint;
}

interface WorkbenchLeafArt extends WorkbenchHotspot {
  readonly anchor: WorkbenchArtPoint;
  readonly sprite: WorkbenchArtImage;
  readonly cover: WorkbenchArtImage;
}

// Measurements share the 1440 × 900 coordinate system of the selected artwork.
export const workbenchPartArt: Readonly<
  Record<WorkbenchLeaf, WorkbenchLeafArt> &
    Record<Exclude<WorkbenchPart, WorkbenchLeaf>, WorkbenchHotspot> &
    Record<"lamp", { readonly sprite: WorkbenchArtImage }> &
    Record<`${WorkbenchDevice}-screen`, { readonly cover: WorkbenchArtImage }>
> = {
  "leaf-0": {
    hit: [758, 93, 65, 45],
    anchor: [799, 142],
    sprite: {
      src: `${workbenchArtRoot}/leaf-0-sprite.webp`,
      box: [755, 90, 72, 53],
    },
    cover: {
      src: `${workbenchArtRoot}/leaf-0-cover.webp`,
      box: [755, 90, 72, 53],
    },
  },
  "leaf-1": {
    hit: [752, 127, 52, 36],
    anchor: [804, 166],
    sprite: {
      src: `${workbenchArtRoot}/leaf-1-sprite.webp`,
      box: [750, 123, 60, 44],
    },
    cover: {
      src: `${workbenchArtRoot}/leaf-1-cover.webp`,
      box: [750, 123, 60, 44],
    },
  },
  "leaf-2": {
    hit: [812, 111, 55, 52],
    anchor: [808, 165],
    sprite: {
      src: `${workbenchArtRoot}/leaf-2-sprite.webp`,
      box: [800, 107, 70, 60],
    },
    cover: {
      src: `${workbenchArtRoot}/leaf-2-cover.webp`,
      box: [800, 107, 70, 60],
    },
  },
  lamp: {
    hit: [855, 211, 166, 24],
    sprite: {
      src: `${workbenchArtRoot}/lamp-diffuser-sprite.webp`,
      box: [856, 214, 164, 24],
    },
  },
  laptop: { hit: [744, 341, 181, 102] },
  display: { hit: [975, 329, 148, 104] },
  "display-key-0": { hit: [968, 439, 84, 13] },
  "laptop-screen": {
    cover: {
      src: `${workbenchArtRoot}/laptop-screen-cover.webp`,
      box: [752, 348, 133, 75],
    },
  },
  "display-screen": {
    cover: {
      src: `${workbenchArtRoot}/display-screen-cover.webp`,
      box: [982, 335, 131, 75],
    },
  },
};

export const workbenchInteractionArt = [
  ...workbenchLeaves.flatMap((part) => {
    const { cover, sprite } = workbenchPartArt[part];
    return [cover, sprite];
  }),
  workbenchPartArt.lamp.sprite,
  workbenchPartArt["laptop-screen"].cover,
  workbenchPartArt["display-screen"].cover,
];
