import { assetPath } from "@/lib/site";

import type {
  WorkbenchDevice,
  WorkbenchLeaf,
  WorkbenchPart,
} from "./workbench-parts";

const workbenchArtRoot = "/assets/workbench-2d";
export const workbenchDrawingArt = {
  rest: assetPath(`${workbenchArtRoot}/workbench-rest.webp`),
  paper: assetPath("/assets/sketchbook-paper.webp"),
  pencil: assetPath("/assets/drawing-pencil.webp"),
} as const;

export const workbenchTextureArt = [
  {
    id: "table-texture",
    owner: "table",
    src: assetPath(`${workbenchArtRoot}/workbench-table-texture.webp`),
    parts: ["table-grain", "table-cast-shadow"],
  },
  {
    id: "pegboard-texture",
    owner: "pegboard",
    src: assetPath(`${workbenchArtRoot}/workbench-pegboard-texture.webp`),
    parts: ["pegboard-grain"],
  },
  {
    id: "shelf-texture",
    owner: "upper-shelf",
    src: assetPath(`${workbenchArtRoot}/workbench-shelf-texture.webp`),
    parts: ["shelf-grain"],
  },
] as const;

// The image uses the full drawing dimensions to preserve sampling on mobile.
export const workbenchChairBackground = {
  id: "chair-background",
  src: assetPath(`${workbenchArtRoot}/workbench-chair-background.webp`),
  box: { x: 796, y: 497, width: 186, height: 237 },
} as const;

export const workbenchSurfaceArt = [
  ...workbenchTextureArt,
  workbenchChairBackground,
] as const;

export type WorkbenchSurfaceLayer = (typeof workbenchSurfaceArt)[number]["id"];

export const workbenchSheet = {
  width: 1440,
  height: 900,
  top: 82,
  sceneHeight: 682,
} as const;

type WorkbenchArtBox = readonly [number, number, number, number];

export interface WorkbenchArtImage {
  readonly src: string;
  readonly box: WorkbenchArtBox;
}

interface WorkbenchHotspot {
  readonly hit: WorkbenchArtBox;
}

const plantBox: WorkbenchArtBox = [750, 90, 119, 75];
export const workbenchPlantArt = {
  background: {
    src: `${workbenchArtRoot}/plant-background.webp`,
    box: plantBox,
  },
  foliage: { src: `${workbenchArtRoot}/plant-foliage.webp`, box: plantBox },
} as const;

// Trace complete leaf-bearing twigs. The only cuts through ink are at stem joints.
export const workbenchPlantTwigs = {
  "leaf-0": {
    pivot: [796.5, 114],
    outline:
      "M766 90H817V97L810 101L810 109L802 113L799 116H795L793 112L789 110L785 109L778 107.5L770 103L766 101Z",
  },
  "leaf-1": {
    pivot: [798, 161],
    outline:
      "M751 144H779L784 145L785 149L788 151L789 155L796 158L801 160L800 164H796L793 160L787 157L783 163L774 165H752Z",
  },
  "leaf-2": {
    pivot: [822, 153],
    outline:
      "M822 152L826 146L831 143L837 139L840 134L846 130H853L862 136L868 142L869 148L864 149L850 145L845 144L838 145L847 152L851 161H846L838 158L831 151H827L824 155L821 154Z",
  },
} as const satisfies Record<
  WorkbenchLeaf,
  { readonly pivot: readonly [number, number]; readonly outline: string }
>;

// Measurements share the 1440 × 900 coordinate system of the selected artwork.
export const workbenchPartArt: Readonly<
  Record<WorkbenchPart, WorkbenchHotspot> &
    Record<"lamp", { readonly sprite: WorkbenchArtImage }> &
    Record<`${WorkbenchDevice}-screen`, { readonly cover: WorkbenchArtImage }>
> = {
  "leaf-0": { hit: [758, 93, 65, 45] },
  "leaf-1": { hit: [752, 127, 52, 36] },
  "leaf-2": { hit: [812, 111, 55, 52] },
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

// Trace the receiving surfaces and the devices that cover them in the artwork.
export const workbenchLampLight = {
  pegboard: "M 786 221 L 1192 210 L 1200 433 L 789 415 Z",
  worktop: "M 638 436 L 746 413 L 1200 433 L 1252 436 L 1169 476 Z",
  occluders: [
    "M 745 344 L 876 342 L 891 418 L 923 428 L 922 438 L 785 444 L 754 429 Z",
    "M 985 329 L 1120 332 L 1111 415 L 1056 414 L 1054 426 L 1075 430 L 1074 438 L 1016 437 L 1009 433 L 1010 428 L 1033 425 L 1034 414 L 974 410 Z",
    "M 973 437 L 1056 440 L 1042 452 L 961 449 Z",
  ],
} as const;

export const workbenchInteractionArt = [
  workbenchPlantArt.background,
  workbenchPlantArt.foliage,
  workbenchPartArt.lamp.sprite,
  workbenchPartArt["laptop-screen"].cover,
  workbenchPartArt["display-screen"].cover,
];
