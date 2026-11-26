import { strokeGeometry } from "./pencil-path";
import {
  artworkSettledAt,
  backgroundDrawing,
  drawingObjects,
} from "./pencil-plan";

import type { DrawingStage, PencilPoint } from "./pencil-plan";

type ContactStyle = {
  id: string;
  width: number;
  opacity: number;
  layer: "reference" | "surface" | "holes" | "ink" | "yellow";
  color?: string;
};

type StrokeContact = ContactStyle & {
  kind: "stroke";
  path: string;
  hatching?: "surface" | "texture";
};

type Contact =
  | (ContactStyle & { kind: "point"; point: PencilPoint })
  | StrokeContact;

type PartDraft = {
  id: string;
  clip?: string;
  bounds?: readonly [number, number, number, number];
  strokeWidth?: number;
  contacts: readonly Contact[];
};

export type DrawingMark = Contact & {
  object: DrawingStage;
  part: string;
  fromMs: number;
  toMs: number;
  medium: "graphite" | "yellow";
};

function stroke(
  id: string,
  width: number,
  path: string,
  opacity = 1,
  layer: ContactStyle["layer"] = "reference",
): StrokeContact {
  return { id, width, path, opacity, layer, kind: "stroke" };
}

function surface(id: string, width: number, path: string): Contact {
  const contact = stroke(id, width, path, 1, "surface");
  if (width >= 28) contact.hatching = "surface";
  return contact;
}

function shade(
  id: string,
  width: number,
  path: string,
  opacity: number,
): Contact {
  return stroke(id, width, path, opacity, "ink");
}

const surfaceStrokeWidth = 60;
const objectStrokeWidth = 12;

function referencePart(
  id: string,
  clip: string,
  contacts: readonly Contact[],
  brush: number,
  strokeWidth = surfaceStrokeWidth,
): PartDraft {
  const coordinates = clip.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const xs = coordinates.filter((_, index) => index % 2 === 0);
  const ys = coordinates.filter((_, index) => index % 2 === 1);
  const padding = strokeWidth / 2;
  const bounds = [
    Math.min(...xs) - padding,
    Math.min(...ys) - padding,
    Math.max(...xs) + padding,
    Math.max(...ys) + padding,
  ] as const;
  const [left, top, right, bottom] = bounds;
  const vertical = bottom - top > right - left;
  const breadth = vertical ? right - left : bottom - top;
  const passes = Math.ceil(breadth / brush);
  const step = breadth / passes;
  const finish = Array.from({ length: passes }, (_, index) => {
    const position = (vertical ? left : top) + (index + 0.5) * step;
    const [begin, end] =
      index % 2 === 0
        ? vertical
          ? [top, bottom]
          : [left, right]
        : vertical
          ? [bottom, top]
          : [right, left];
    const path = vertical
      ? `M ${position} ${begin} L ${position} ${end}`
      : `M ${begin} ${position} L ${end} ${position}`;
    return {
      ...stroke(`${id}-texture-${index + 1}`, step + 4, path),
      hatching: "texture" as const,
    };
  });
  const color = contacts.findIndex(({ layer }) => layer === "yellow");
  return {
    id,
    clip,
    bounds,
    strokeWidth,
    contacts:
      color === -1
        ? [...contacts, ...finish]
        : [...contacts.slice(0, color), ...finish, ...contacts.slice(color)],
  };
}

function part(id: string, clip: string, ...contacts: Contact[]): PartDraft {
  const strokeWidth = id.startsWith("chair")
    ? 6
    : id.startsWith("table-")
      ? 4
      : objectStrokeWidth;
  return referencePart(id, clip, contacts, 50, strokeWidth);
}

const tableFront = "M 1169 476 Q 900 456 637 436";
const tableBack = "L 746 413 L 1252 436 L 1169 476";

export const workbenchStructure = {
  tabletop: `${tableFront} ${tableBack} Z`,
  tabletopGrain:
    "M 674 431 Q 926 440 1207 450 M 694 437 Q 920 451 1184 463 M 744 425 Q 963 426 1224 441",
  rearLeg: "M 755 460 L 775 466 L 775 589 L 768 596 L 756 594 Z",
  lowerShelf: "M 691 552 L 728 532 L 848 549 L 809 568 Z",
  lowerShelfEdge:
    "M 691 552 L 809 568 L 848 549 L 848 562 L 809 581 L 691 566 Z",
  cabinet: "M 1007 484 L 1148 497 L 1147 653 L 1007 634 Z",
  tableRecess: "M 689 458 L 1008 483 L 1008 638 L 689 607 Z",
  pegboard: "M 789 224 L 1197 214 L 1206 433 L 787 416 Z",
  pegboardPosts:
    "M 767 219 L 790 217 L 789 416 L 773 419 Z M 1196 215 L 1219 220 L 1227 435 L 1205 429 Z",
  upperShelf:
    "M 732 207 L 1179 195 L 1227 204 L 1227 215 L 1179 206 L 732 217 Z",
  shelfShadow: "M 789 217 L 1196 207 L 1200 263 L 789 254 Z",
} as const;

export const yellowDrawer =
  "M 1010 561 L 1141 577 L 1140 649 L 1010 629 Z M 1052 568 L 1096 574 L 1096 582 L 1052 577 Z";

const holeColumns = [
  795, 808, 821, 835, 848, 862, 875, 889, 903, 916, 929, 943, 957, 971, 985,
  998, 1011, 1024, 1038, 1052, 1067, 1081, 1096, 1113, 1129, 1146, 1162, 1178,
  1195,
];

export const pegboardHoleRows = Array.from({ length: 14 }, (_, row) =>
  holeColumns.map((x): PencilPoint => {
    const fraction = (x - 795) / 400;
    return [
      x + row * 0.09 * fraction,
      235 - 5.3 * fraction + row * (13.15 + 1.65 * fraction),
    ];
  }),
);

const pegboardHoles = pegboardHoleRows
  .map((row, index) => {
    if (index % 2 === 0) return undefined;
    const [left, right] = [row[0]!, row.at(-1)!];
    const [start, end] = index % 4 === 1 ? [left, right] : [right, left];
    return stroke(
      `pegboard-holes-${index}`,
      29,
      `M ${start[0]} ${start[1] - 7} L ${end[0]} ${end[1] - 7}`,
      1,
      "holes",
    );
  })
  .filter((contact) => contact !== undefined);

// The reference atlas has the finished scene printed on it. Each part gets
// only its own visible silhouette. The supporting surfaces above are painted
// separately at full depth, including the areas covered by later parts.
const tableClip = [
  "M 637 435 L 1169 475 L 1253 435 L 1254 448 L 1171 490 L 637 448 Z",
  "M 663 449 L 995 474 L 994 487 L 691 464 L 692 622 L 688 632 L 665 630 L 660 623 Z",
  "M 686 465 L 701 465 L 701 477 L 686 499 Z",
  "M 993 473 L 1009 477 L 1010 632 L 1149 650 L 1149 486 L 1178 480 L 1178 692 L 1168 703 L 1148 699 L 1148 667 L 992 646 Z",
  "M 1175 487 L 1241 450 L 1242 632 L 1228 640 L 1219 635 L 1219 609 L 1176 642 Z",
].join(" ");

const tableReference = [
  tableClip,
  workbenchStructure.tabletop,
  workbenchStructure.tableRecess,
  workbenchStructure.cabinet,
  "M 978 466 L 1184 479 L 1184 510 L 978 500 Z",
  "M 1237 451 L 1257 435 Q 1278 451 1288 480 L 1284 557 Q 1279 605 1253 629 L 1236 634 Z",
].join(" ");
export const tableCastShadow =
  "M 658 605 Q 752 570 797 583 L 985 603 Q 1113 585 1236 572 Q 1293 589 1291 630 Q 1260 682 1184 713 Q 1065 727 991 708 Q 947 703 907 718 Q 872 725 813 695 Q 773 682 697 650 Q 651 637 658 605 Z";
const pegboardReference = "M 767 217 L 1220 207 L 1229 435 L 768 420 Z";

const laptopClip = [
  "M 746 347 Q 745 342 752 342 L 876 341 Q 880 341 882 346 L 892 417 L 922 426 Q 927 428 924 434 L 788 446 L 756 432 Z",
  "M 877 346 Q 889 346 896 359 L 907 393 Q 915 413 919 421 L 899 422 L 885 404 Z",
].join(" ");
const displayClip = [
  "M 984 330 Q 986 327 992 328 L 1118 331 Q 1121 331 1120 336 L 1111 412 Q 1111 416 1106 416 L 1057 414 L 1057 426 L 1076 429 L 1078 433 L 1077 438 L 1016 438 L 1008 433 L 1010 429 L 1033 425 L 1034 412 L 975 408 Q 972 407 974 401 Z",
  "M 1114 335 Q 1126 338 1129 352 L 1126 404 Q 1125 415 1119 424 L 1099 428 L 1108 403 Z",
  "M 1006 428 Q 1037 425 1074 428 Q 1086 431 1086 435 Q 1064 440 1017 440 Z",
].join(" ");
const stoolClip = [
  "M 835 543 C 836 523 931 514 938 539 L 937 553 Q 927 571 850 570 L 837 561 Z",
  "M 875 566 L 899 565 L 897 602 L 900 606 L 898 642 L 875 645 L 874 605 L 878 600 L 878 572 L 861 576 L 860 572 Z",
].join(" ");
const stoolFootrestClip = [
  "M 828 630 C 829 616 855 607 887 607 C 921 607 945 616 944 629 C 945 642 917 651 887 650 C 855 651 828 642 828 630 Z",
  "M 835 628 C 838 635 861 642 887 642 C 912 642 935 637 938 628 C 934 620 913 613 889 614 C 862 613 839 619 835 628 Z",
].join(" ");
const stoolLegsClip = [
  "M 876 642 L 887 649 L 882 659 L 825 675 L 824 680 L 827 682 L 827 687 L 821 690 L 812 688 L 812 681 L 815 678 L 815 666 L 820 660 Z",
  "M 898 642 L 918 645 L 954 659 L 958 663 L 959 673 L 962 677 L 962 681 L 955 683 L 946 682 L 944 678 L 946 672 L 946 667 L 900 658 L 894 653 Z",
  "M 877 645 L 892 646 L 898 653 L 898 666 L 900 684 L 900 699 L 903 704 L 903 708 L 897 710 L 889 710 L 886 707 L 887 703 L 890 700 L 889 687 L 885 668 L 881 660 L 878 659 Z",
  "M 813 685 Q 835 675 860 666 L 886 650 Q 910 649 930 659 Q 964 666 966 679 Q 974 692 946 698 Q 919 709 907 716 Q 893 721 881 711 Q 870 697 848 697 Q 824 696 813 690 Z",
].join(" ");

function narrowPart(
  id: string,
  clip: string,
  path: string,
  width: number,
): PartDraft {
  return part(
    id,
    clip,
    stroke(`${id}-outline`, Math.min(width * 0.32, 5), path, 0.55),
    stroke(`${id}-hatch`, width, path, 1),
  );
}

const drafts = {
  background: [
    {
      id: "room-background",
      contacts: [
        stroke("wall-left-height", 13, "M 735 226 L 735 409"),
        stroke("floor-left-height", 15, "M 624 420 L 626 633"),
        stroke(
          "floor-left-arc",
          10,
          "M 624 517 Q 581 520 584 563 Q 588 589 624 597",
        ),
        shade("floor-guide-left", 0.8, "M 571 701 L 1033 544", 0.17),
        shade("floor-guide-depth", 0.8, "M 1140 552 L 700 757", 0.17),
        shade("floor-guide-cross", 0.8, "M 551 609 L 1264 685", 0.17),
        stroke("wall-upper-left", 13, "M 747 102 L 748 199"),
        shade("wall-plant-axis", 1, "M 806.8 166 L 807.4 82", 0.36),
        stroke("wall-center-length", 16, "M 847 158 L 1027 149 L 1027 193"),
        stroke(
          "wall-upper-length",
          17,
          "M 1049 165 L 1049 108 L 1200 100 L 1200 151",
        ),
        stroke("wall-right-height", 19, "M 1275 131 L 1276 453"),
        stroke("wall-right-length", 16, "M 1237 221 L 1237 202 L 1321 200"),
        stroke("wall-outer-height", 12, "M 1320 194 L 1321 645"),
        stroke(
          "wall-right-ellipse",
          17,
          "M 1275 322 C 1318 316 1312 412 1276 408 C 1234 414 1232 322 1275 322",
        ),
        shade("floor-guide-far", 0.8, "M 1405 568 L 1190 752", 0.17),
        shade("floor-guide-right", 0.8, "M 1358 569 L 1018 747", 0.17),
        shade("floor-guide-short", 0.8, "M 975 762 L 1281 644", 0.17),
        shade("floor-guide-center", 0.8, "M 1232 568 L 822 761", 0.17),
        shade("floor-guide-near", 0.8, "M 1130 754 L 556 726", 0.17),
        shade("floor-guide-middle", 0.8, "M 549 624 L 1127 704", 0.17),
        // Overlapping graphite passes finish the paper and faint environment
        // detail between the main lines, all within the room stencil.
        ...[123, 249, 375, 501, 627, 743].map((y, index): StrokeContact => {
          const [from, to] = index % 2 ? [563, 1337] : [1337, 563];
          return {
            ...stroke(
              `room-tone-${index + 1}`,
              250,
              `M ${from} ${y} L ${to} ${y}`,
            ),
            hatching: "texture",
          };
        }),
      ],
    },
  ],
  table: [
    {
      id: "table-surfaces",
      contacts: [
        {
          id: "point-rightFoot",
          kind: "point",
          point: [1163, 697],
          width: 4.5,
          opacity: 0.65,
          layer: "ink",
        },
        shade("table-placement", 1.4, "M 1163 697 L 1183 683 L 1236 635", 0.37),
        surface("guide-depth", 7, "M 1169 476 L 1252 436"),
        surface("guide-worktop", 9, tableFront),
        surface("tabletop-outline", 11, `M 637 436 ${tableBack}`),
        surface("tabletop-rear-tone", 31, "M 707 422 Q 972 432 1234 442"),
        surface("tabletop-front-tone", 36, "M 1201 457 Q 978 452 650 435"),
        surface("table-rear-support", 25, "M 766 463 L 766 594"),
        surface(
          "lower-shelf",
          28,
          "M 691 552 L 728 532 L 848 549 L 809 568 L 691 552 L 691 564 L 809 581 L 848 562",
        ),
        surface(
          "cabinet-support",
          62,
          "M 1018 485 L 1018 635 L 1061 641 L 1061 487 L 1101 493 L 1101 646 L 1140 653 L 1140 493",
        ),
      ],
    },
    part(
      "table-frame",
      tableClip,
      stroke("table-front-lip", 25, "M 637 440 Q 903 462 1170 483 L 1252 442"),
      stroke("table-apron", 20, "M 691 458 Q 847 470 998 484"),
      stroke("table-left-leg", 25, "M 680 458 L 679 622 L 667 627 L 688 627"),
      stroke("table-front-bracket", 24, "M 776 471 L 699 464 L 684 489"),
      stroke("table-right-rail", 20, "M 1000 479 L 999 641 L 1147 658"),
      stroke("table-right-leg", 35, "M 1164 486 L 1163 691 L 1171 698"),
      stroke(
        "table-side",
        45,
        "M 1181 492 L 1229 466 L 1226 620 L 1228 634 L 1236 632 L 1219 608 L 1189 631 L 1196 491",
      ),
    ),
    part(
      "table-diagonal-brace",
      "M 689 484 L 757 468 L 766 469 L 760 475 L 689 493 Z",
      stroke("table-diagonal-brace", 12, "M 690 489 Q 727 479 762 471"),
    ),
    part(
      "table-rear-foot",
      "M 760 574 L 779 574 L 779 587 L 783 591 L 783 596 L 772 599 L 755 596 L 753 591 L 760 587 Z",
      stroke(
        "table-rear-foot",
        15,
        "M 768 574 L 767 589 L 779 591 L 772 595 L 755 593",
      ),
    ),
    {
      id: "table-grounding",
      contacts: [
        surface(
          "table-recess-shading",
          82,
          "M 691 472 Q 856 484 1007 498 L 1004 568 Q 855 538 697 539 L 694 591 Q 852 575 1008 619",
        ),
        shade("table-left-contact", 5, "M 665 630 Q 683 636 706 632", 0.2),
        shade(
          "table-rear-foot-contact",
          7,
          "M 748 597 Q 772 605 790 593",
          0.25,
        ),
        shade("table-back-contact", 5, "M 1223 634 Q 1247 638 1263 625", 0.17),
        shade("table-right-contact", 6, "M 1151 698 Q 1174 706 1192 692", 0.21),
      ],
    },
    referencePart("table-grain", tableReference, [], 72, 12),
    referencePart("table-cast-shadow", tableCastShadow, [], 61, 44),
  ],
  toolbox: [
    part(
      "toolbox",
      "M 712 507 L 747 494 L 824 498 L 846 508 L 843 546 L 807 564 L 721 563 L 711 551 Z",
      stroke(
        "toolbox-outline",
        7,
        "M 716 549 L 715 508 L 748 496 L 824 499 L 844 508 L 841 546 L 808 563 L 721 561 Z",
        0.68,
      ),
      stroke(
        "toolbox-lid",
        27,
        "M 718 512 Q 775 509 825 504 L 836 508 L 804 525 L 721 519",
      ),
      stroke(
        "toolbox-face",
        31,
        "M 721 533 L 802 543 L 833 525 L 831 543 L 802 552 L 721 548",
      ),
      stroke(
        "toolbox-handle",
        11,
        "M 753 539 Q 754 553 769 555 L 789 556 L 791 543",
      ),
      shade(
        "toolbox-contact",
        8,
        "M 719 556 Q 761 570 812 566 L 840 553",
        0.24,
      ),
    ),
  ],
  drawers: [
    part(
      "drawers",
      "M 1008 485 L 1145 501 L 1143 650 L 1010 632 Z",
      stroke(
        "drawers-layout",
        7,
        "M 1010 490 L 1142 503 L 1142 649 L 1010 630 Z L 1010 522 L 1140 535 L 1140 563 L 1010 548",
        0.67,
      ),
      stroke("drawers-top", 32, "M 1017 496 L 1135 510 L 1135 520 L 1019 507"),
      stroke(
        "drawers-middle",
        32,
        "M 1019 534 L 1133 545 L 1132 554 L 1019 544",
      ),
      stroke(
        "drawers-lower-tone",
        49,
        "M 1022 574 L 1131 588 L 1129 630 L 1021 613",
      ),
      stroke(
        "drawers-pulls",
        13,
        "M 1050 505 L 1098 510 L 1097 542 L 1051 536 L 1051 572 L 1097 577",
      ),
      stroke(
        "drawer-yellow-first",
        35,
        "M 1013 567 Q 1077 577 1141 587",
        1,
        "yellow",
      ),
      stroke(
        "drawer-yellow-second",
        38,
        "M 1138 607 Q 1075 598 1013 588",
        1,
        "yellow",
      ),
      stroke(
        "drawer-yellow-third",
        38,
        "M 1013 611 Q 1078 621 1139 629",
        1,
        "yellow",
      ),
      stroke(
        "drawer-yellow-edge",
        32,
        "M 1139 647 Q 1078 636 1013 626",
        1,
        "yellow",
      ),
    ),
  ],
  pegboard: [
    {
      id: "pegboard",
      contacts: [
        surface("pegboard-left-post", 29, "M 778 418 L 778 220"),
        surface(
          "pegboard-outline",
          14,
          "M 787 417 L 789 225 L 1198 214 L 1205 430 L 788 415",
        ),
        surface("pegboard-right-post", 30, "M 1207 216 L 1216 433"),
        surface(
          "pegboard-plane",
          90,
          "M 792 251 L 1198 238 L 1200 308 L 792 320 L 792 387 L 1203 397",
        ),
        ...pegboardHoles,
      ],
    },
    referencePart("pegboard-grain", pegboardReference, [], 59, 8),
  ],
  "upper-shelf": [
    {
      id: "upper-shelf",
      contacts: [
        surface(
          "shelf-outline",
          6,
          "M 732 207 L 1179 195 L 1227 204 L 1227 215 L 1179 206 L 732 217 Z",
        ),
        surface("shelf-thickness", 16, "M 732 211 L 1179 200 L 1225 211"),
      ],
    },
    part(
      "shelf-left-bracket",
      "M 748 215 L 789 215 L 791 230 Q 793 253 781 266 L 775 266 L 757 229 Z",
      stroke(
        "shelf-left-bracket",
        28,
        "M 751 217 Q 777 219 787 231 Q 786 253 779 263 L 758 223",
      ),
    ),
    part(
      "shelf-right-bracket",
      "M 1181 207 L 1224 212 L 1225 238 L 1213 264 L 1205 265 L 1190 226 Z",
      stroke(
        "shelf-right-bracket",
        30,
        "M 1186 211 Q 1212 216 1220 233 L 1208 263 L 1193 220",
      ),
    ),
    {
      id: "shelf-underside",
      contacts: [
        surface("shelf-shadow", 65, "M 788 230 Q 998 217 1201 226"),
        shade("shelf-underside", 4.5, "M 789 219 Q 992 212 1179 209", 0.22),
      ],
    },
    referencePart(
      "shelf-grain",
      "M 731 203 L 1179 193 L 1227 201 L 1228 238 L 1217 265 L 775 264 L 750 231 L 731 219 Z",
      [],
      27,
    ),
  ],
  chair: [
    part(
      "chair",
      stoolClip,
      shade("chair-axis", 1.4, "M 885 528 L 889 698", 0.32),
      stroke(
        "chair-seat-outline",
        8,
        "M 836 544 C 837 521 933 518 937 541 Q 936 562 851 562 Z",
        0.68,
      ),
      stroke(
        "chair-seat-plane",
        31,
        "M 846 543 Q 885 531 928 542 Q 903 556 846 551",
      ),
      stroke("chair-column", 24, "M 889 565 L 888 645"),
    ),
    part(
      "chair-footrest-spokes",
      "M 842 615 L 912 638 L 914 643 L 907 644 L 842 621 Z M 925 615 L 934 618 L 892 638 L 857 645 L 850 641 Z",
      stroke("chair-left-spoke", 12, "M 843 619 L 911 643"),
      stroke("chair-right-spoke", 12, "M 931 618 L 854 642"),
    ),
    part(
      "chair-footrest",
      stoolFootrestClip,
      stroke(
        "chair-footrest",
        13,
        "M 831 629 C 833 616 861 610 887 610 C 918 610 944 618 941 630 C 940 639 915 647 887 646 C 859 646 830 640 831 629 Z",
      ),
    ),
    part(
      "chair-legs",
      stoolLegsClip,
      stroke(
        "chair-feet",
        19,
        "M 819 685 L 820 667 L 882 649 L 892 653 L 896 705 L 895 650 L 951 665 L 953 678",
      ),
      shade("chair-left-contact", 5, "M 815 688 Q 831 687 845 682", 0.2),
      shade("chair-right-contact", 4, "M 947 681 Q 957 685 975 677", 0.18),
      shade("chair-front-contact", 6, "M 888 710 Q 904 712 921 699", 0.24),
    ),
  ],
  laptop: [
    part(
      "laptop",
      laptopClip,
      stroke(
        "laptop-base",
        12,
        "M 922 430 L 890 419 L 759 423 L 786 442 L 922 432",
        0.74,
      ),
      stroke(
        "laptop-frame",
        9,
        "M 760 424 L 748 345 L 878 344 L 890 418 L 760 424",
        0.74,
      ),
      stroke(
        "laptop-screen",
        30,
        "M 753 358 L 877 355 L 881 376 L 758 380 L 763 406 L 888 402 L 889 417 L 766 422",
      ),
      stroke("laptop-keys", 15, "M 764 424 L 881 419 L 910 428 L 787 439"),
      stroke(
        "laptop-diagram",
        6,
        "M 778 396 L 811 369 L 842 390 L 812 412 L 778 396",
      ),
      stroke("laptop-board-shadow", 13, "M 889 355 Q 899 386 910 417"),
      shade("laptop-contact", 4.3, "M 783 445 Q 851 446 922 434", 0.16),
    ),
  ],
  display: [
    part(
      "monitor",
      displayClip,
      stroke(
        "display-base",
        17,
        "M 1038 407 L 1036 425 L 1012 432 L 1075 433 L 1053 425 L 1053 410",
        0.83,
      ),
      stroke(
        "display-frame",
        10,
        "M 976 407 L 987 331 L 1119 334 L 1110 414 L 976 407",
        0.75,
      ),
      stroke(
        "display-screen",
        29,
        "M 987 343 L 1116 346 L 1113 368 L 984 365 L 980 388 L 1110 391 L 1108 409 L 977 404",
      ),
      stroke(
        "display-diagram",
        8,
        "M 1018 379 Q 1034 349 1049 355 C 1073 359 1073 383 1053 388 C 1035 392 1026 378 1034 365 L 1075 365",
      ),
      stroke("display-board-shadow", 13, "M 1121 341 Q 1126 375 1119 418"),
      shade("display-contact", 4, "M 1014 438 Q 1051 441 1078 437", 0.17),
    ),
    part(
      "external-keyboard",
      "M 969 437 L 1046 438 L 1056 442 L 1042 454 L 965 451 L 961 448 Z",
      stroke(
        "keyboard-outline",
        7,
        "M 962 448 L 971 439 L 1053 441 L 1042 453 L 962 449",
        0.7,
      ),
      stroke("keyboard-keys", 14, "M 968 445 L 1048 445"),
    ),
    part(
      "mouse",
      "M 1057 454 Q 1066 438 1084 442 Q 1090 444 1086 450 Q 1080 457 1057 454 Z",
      stroke(
        "mouse-outline",
        5,
        "M 1059 453 Q 1066 441 1083 444 L 1084 450 L 1059 453",
        0.72,
      ),
      stroke("mouse-tone", 12, "M 1062 451 Q 1074 444 1084 447"),
    ),
    part(
      "desk-pencil",
      "M 909 446 L 934 438 L 956 433 L 963 433 L 967 437 L 963 442 L 930 447 L 909 450 Z",
      stroke("desk-pencil-point", 4, "M 910 448 L 925 444", 0.76),
      stroke("desk-pencil-shaft", 9, "M 924 444 L 963 437"),
    ),
  ],
  vise: [
    part(
      "vise",
      "M 1130 452 L 1139 449 L 1139 441 L 1132 439 L 1132 428 L 1141 424 L 1146 418 L 1139 410 L 1132 406 L 1134 399 L 1169 397 L 1184 402 L 1184 412 L 1189 414 L 1191 433 L 1188 444 L 1194 450 L 1195 460 L 1131 467 Z",
      stroke(
        "vise-base",
        13,
        "M 1131 459 L 1166 461 L 1191 456 L 1185 448 L 1142 452",
      ),
      stroke(
        "vise-outline",
        8,
        "M 1141 453 L 1142 430 L 1150 420 L 1137 402 L 1178 401 L 1185 419 L 1189 433 L 1183 450",
        0.75,
      ),
      stroke(
        "vise-metal",
        28,
        "M 1140 405 L 1163 408 L 1176 414 L 1161 425 L 1140 436 L 1167 434 L 1183 427 L 1177 450 L 1151 453",
      ),
      stroke("vise-handle", 11, "M 1146 432 L 1151 436 L 1150 461"),
      shade("vise-contact", 5, "M 1130 466 L 1160 467 L 1194 460", 0.2),
    ),
  ],
  plant: [
    part(
      "plant",
      "M 788 204 L 784 173 L 782 169 L 786 165 L 750 159 L 751 142 L 762 132 L 755 119 L 770 101 L 761 94 L 775 88 L 802 94 L 813 88 L 834 96 L 840 107 L 852 109 L 862 123 L 869 135 L 859 148 L 847 155 L 829 163 L 819 167 L 827 169 L 823 202 Z",
      stroke(
        "plant-pot-outline",
        8,
        "M 790 203 L 785 169 Q 805 162 825 167 L 822 202 Z",
        0.71,
      ),
      stroke("plant-pot-tone", 31, "M 803 172 L 804 198"),
      stroke(
        "plant-stems",
        10,
        "M 805 166 Q 802 145 801 128 L 804 103 L 808 146 L 827 135 L 837 121",
      ),
      stroke(
        "plant-leaves-left",
        22,
        "M 797 159 L 761 151 L 785 143 L 765 127 L 785 124 L 773 103 L 792 106 L 775 93",
      ),
      stroke(
        "plant-leaves-right",
        24,
        "M 804 119 L 817 95 L 831 105 L 816 121 L 840 111 L 851 121 L 829 133 L 858 136 L 845 146 L 818 154",
      ),
      stroke("plant-leaf-veins", 16, "M 768 154 L 798 146 L 817 153 L 837 145"),
      shade("plant-pot-contact", 3.4, "M 788 204 L 824 204", 0.19),
    ),
  ],
  "shelf-boxes": [
    part(
      "shelf-box-left",
      "M 826 174 L 843 168 L 872 170 L 878 176 L 878 201 L 822 204 L 823 192 Z",
      stroke(
        "left-box-outline",
        7,
        "M 826 201 L 826 174 L 844 170 L 876 173 L 876 201 Z",
        0.68,
      ),
      stroke(
        "left-box-body",
        25,
        "M 828 179 Q 855 175 875 179 L 874 195 L 828 196",
      ),
      stroke("left-box-tab", 8, "M 836 178 L 854 179"),
      shade("left-box-contact", 3, "M 827 204 L 877 201", 0.16),
    ),
    part(
      "shelf-box-right",
      "M 878 173 L 903 169 L 918 168 L 950 175 L 949 199 L 878 201 Z",
      stroke(
        "right-box-outline",
        7,
        "M 878 200 L 880 174 L 918 170 L 949 176 L 949 198 Z",
        0.68,
      ),
      stroke("right-box-body", 25, "M 883 177 L 944 179 L 944 193 L 883 196"),
      stroke("right-box-tab", 8, "M 890 177 L 909 177"),
      shade("right-box-contact", 3.2, "M 878 201 L 947 200", 0.16),
    ),
  ],
  books: [
    narrowPart(
      "book-left",
      "M 1057 197 L 1066 139 L 1074 138 L 1068 196 Z",
      "M 1062 195 L 1070 140",
      11,
    ),
    narrowPart(
      "book-inner-left",
      "M 1069 196 L 1077 130 L 1088 130 L 1088 196 Z",
      "M 1079 195 L 1084 131",
      19,
    ),
    narrowPart(
      "book-center",
      "M 1088 195 L 1088 128 L 1100 128 L 1102 195 Z",
      "M 1095 195 L 1094 130",
      16,
    ),
    narrowPart(
      "book-inner-right",
      "M 1102 194 L 1099 128 L 1114 132 L 1126 140 L 1125 152 L 1122 153 L 1121 194 Z",
      "M 1111 192 L 1106 132 L 1120 140 L 1120 193",
      17,
    ),
    narrowPart(
      "book-right",
      "M 1125 140 L 1137 144 L 1137 151 L 1125 153 Z",
      "M 1131 151 L 1130 142",
      16,
    ),
  ],
  "small-drawers": [
    part(
      "shelf-drawers",
      "M 1122 153 L 1181 146 L 1212 154 L 1212 202 L 1182 196 L 1121 195 Z",
      stroke(
        "small-drawers-outline",
        7,
        "M 1124 194 L 1124 153 L 1181 147 L 1212 154 L 1212 201 L 1182 194 Z",
        0.71,
      ),
      stroke("small-drawers-top", 20, "M 1125 159 L 1180 155 L 1209 160", 0.95),
      stroke("small-drawers-middle", 22, "M 1208 174 L 1181 171 L 1125 173"),
      stroke("small-drawers-lower", 25, "M 1126 187 L 1182 189 L 1209 193"),
      stroke(
        "small-drawers-pulls",
        9,
        "M 1140 156 L 1161 155 L 1160 183 L 1141 183",
      ),
    ),
  ],
  lamp: [
    part(
      "lamp",
      "M 855 222 L 992 213 L 1019 220 L 1019 229 L 1002 232 L 867 236 L 853 230 Z",
      stroke(
        "lamp-shell",
        8,
        "M 855 224 L 993 214 L 1018 221 L 1018 228 L 1000 232 L 866 235 Z",
        0.74,
      ),
      stroke("lamp-diffuser", 19, "M 859 228 Q 935 227 1006 222 L 1015 226"),
      {
        ...shade("lamp-warmth", 22, "M 870 235 Q 937 239 1002 230", 0.22),
        color: "#ffedc8",
      },
    ),
  ],
  tools: [
    narrowPart(
      "left-pliers",
      "M 800 264 L 814 264 L 820 315 L 819 334 L 794 334 L 794 314 Z",
      "M 807 268 L 808 290 Q 814 305 816 329 L 807 311 L 799 330 Q 801 302 806 287",
      14,
    ),
    narrowPart(
      "right-pliers",
      "M 828 263 L 841 263 L 849 315 L 849 332 L 822 332 L 822 315 Z",
      "M 836 267 L 836 289 Q 843 305 846 327 L 836 308 L 825 329 Q 828 302 835 286",
      14,
    ),
    narrowPart(
      "thin-driver",
      "M 854 265 L 866 265 L 867 325 L 854 325 Z",
      "M 860 270 L 860 321",
      12,
    ),
    narrowPart(
      "long-driver",
      "M 872 264 L 884 264 L 884 329 L 872 329 Z",
      "M 878 269 L 878 324",
      12,
    ),
    narrowPart(
      "first-spanner",
      "M 896 271 L 911 271 L 911 343 L 895 343 Z",
      "M 903 277 L 904 337",
      16,
    ),
    narrowPart(
      "second-spanner",
      "M 910 269 L 923 269 L 923 329 L 910 329 Z",
      "M 917 275 L 916 323",
      14,
    ),
    narrowPart(
      "third-spanner",
      "M 924 269 L 936 269 L 936 325 L 924 325 Z",
      "M 930 275 L 930 320",
      13,
    ),
    narrowPart(
      "fourth-spanner",
      "M 938 268 L 950 268 L 950 322 L 937 322 Z",
      "M 944 274 L 943 317",
      13,
    ),
    narrowPart(
      "fifth-spanner",
      "M 951 267 L 964 267 L 964 319 L 951 319 Z",
      "M 957 273 L 958 315",
      14,
    ),
    narrowPart(
      "t-handle",
      "M 975 272 L 996 272 L 995 283 L 988 284 L 989 330 L 979 330 L 979 283 L 974 282 Z",
      "M 978 278 L 992 278 L 984 278 L 984 326",
      12,
    ),
    narrowPart(
      "middle-driver",
      "M 1009 267 L 1021 267 L 1021 320 L 1007 320 Z",
      "M 1015 272 L 1014 315",
      12,
    ),
    narrowPart(
      "tool-cup",
      "M 1055 266 L 1119 266 L 1119 289 L 1125 306 Q 1124 321 1114 329 L 1068 327 L 1062 295 L 1055 295 Z",
      "M 1061 272 L 1070 289 L 1081 272 L 1088 290 L 1102 272 L 1111 292 L 1104 314 L 1071 315 L 1066 296 L 1112 292",
      21,
    ),
    narrowPart(
      "hammer",
      "M 1129 273 L 1176 273 L 1175 284 L 1154 284 L 1154 367 L 1141 366 L 1140 284 L 1129 283 Z",
      "M 1134 279 L 1170 279 L 1148 279 L 1147 361",
      13,
    ),
    narrowPart(
      "right-tall-driver",
      "M 1160 285 L 1173 285 L 1173 348 L 1160 348 Z",
      "M 1166 290 L 1166 342",
      13,
    ),
    narrowPart(
      "right-short-driver",
      "M 1173 311 L 1188 311 L 1188 385 L 1173 385 Z",
      "M 1180 315 L 1180 364",
      15,
    ),
  ],
} satisfies Record<DrawingStage, readonly PartDraft[]>;

type DrawingWindow = typeof backgroundDrawing | (typeof drawingObjects)[number];

function schedule({ id, start, end }: DrawingWindow) {
  const parts: readonly PartDraft[] = drafts[id];
  const contacts = parts.flatMap((part) => part.contacts);
  const weights = contacts.map((contact) =>
    contact.kind === "point"
      ? 8
      : 5 + Math.sqrt(strokeGeometry(contact.path).length),
  );
  const gaps = contacts
    .slice(1)
    .map((contact, index) =>
      (contact.layer === "yellow") !== (contacts[index]?.layer === "yellow")
        ? 72
        : 15,
    );
  const last = end === artworkSettledAt ? end : end - 20;
  let cursor = start + (start === 0 ? 36 : 13);
  let index = 0;
  const available = last - cursor - gaps.reduce((sum, gap) => sum + gap, 0);
  const weightsTotal = weights.reduce((sum, weight) => sum + weight, 0);

  return parts.map((part) => ({
    id: part.id,
    object: id,
    clip: part.clip,
    bounds: part.bounds,
    strokeWidth: part.strokeWidth,
    marks: part.contacts.map<DrawingMark>((contact) => {
      const fromMs = cursor;
      const toMs =
        index === contacts.length - 1
          ? last
          : fromMs + (available * weights[index]!) / weightsTotal;
      cursor = toMs + (gaps[index] ?? 0);
      index++;
      return {
        ...contact,
        object: id,
        part: part.id,
        fromMs,
        toMs,
        medium: contact.layer === "yellow" ? "yellow" : "graphite",
      };
    }),
  }));
}

export const drawingParts = [backgroundDrawing, ...drawingObjects].flatMap(
  schedule,
);
export const drawingMarks = drawingParts.flatMap(({ marks }) => marks);

// Where parts meet, keep the later part's subtraction on its own side of
// the edge. Coordinates follow the ink in the full-resolution reference.
export const sharedReferenceEdges: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "table-frame": {
    "pegboard-grain": "M 0 0 H 1440 V 434 H 1248 V 900 H 0 Z",
  },
  monitor: {
    "t-handle":
      "M 970 310 H 1000 V 329 H 987.5 L 986.3 330.4 L 985.6 331 H 970 Z",
    "external-keyboard":
      "M 950 436.7 L 995 438 L 1024 439.5 L 1057 441.2 L 1064 443.6 V 470 H 950 Z",
  },
  plant: {
    "shelf-box-left": "M 830 0 H 1440 V 900 H 825 V 181 H 824 V 173 H 830 Z",
  },
  "book-left": {
    "book-inner-left": "M 1073 116 H 1140 V 207 H 1073 Z",
  },
  "book-center": {
    "book-inner-right":
      "M 1095 116 H 1140 V 207 H 1099 V 133 H 1105 L 1095 128 Z",
  },
};

// Boundaries follow drafts.tools in sheet coordinates and bend at the hammer head.
const toolDividers = [
  822,
  851,
  869.5,
  890.5,
  911,
  924,
  935.5,
  950.75,
  968.5,
  1001.5,
  1035,
  1127.5,
  [
    [1186, 0],
    [1186, 283],
    [1157, 283],
    [1157, 900],
  ],
  [
    [1198, 0],
    [1198, 286],
    [1173, 286],
    [1173, 900],
  ],
] as const satisfies readonly (number | readonly PencilPoint[])[];

function dividerPoints(
  divider: number | readonly PencilPoint[],
  edge: "left" | "right",
): PencilPoint[] {
  const points: readonly PencilPoint[] =
    typeof divider === "number"
      ? [
          [divider, 0],
          [divider, 900],
        ]
      : divider;
  // Both stencils retain a small overlap along the separation, so resampling
  // the sheet at narrow widths cannot open a seam in the finished texture.
  const direction = edge === "left" ? 1 : -1;
  return points.map(([x, y]) => [
    x + 1.25 * direction,
    y > 0 && y < 900 ? y + direction : y,
  ]);
}

export const toolRegions = Object.fromEntries(
  drafts.tools.map(({ id }, index) => {
    const left = dividerPoints(toolDividers[index - 1] ?? 0, "left");
    const right = dividerPoints(toolDividers[index] ?? 1440, "right");
    const outline = [...left, ...right.reverse()].map(([x, y]) => `${x} ${y}`);
    return [id, `M ${outline.join(" L ")} Z`];
  }),
);
