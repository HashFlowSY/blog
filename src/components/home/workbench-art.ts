export const workbenchArtRoot = "/assets/workbench-2d";
export const workbenchSheet = {
  width: 1440,
  height: 900,
  top: 82,
  sceneHeight: 682,
} as const;

export type WorkbenchArtBox = readonly [number, number, number, number];
export type WorkbenchArtPoint = readonly [number, number];

export interface WorkbenchArtImage {
  readonly src: string;
  readonly box: WorkbenchArtBox;
}

export interface WorkbenchPartArt {
  readonly hit: WorkbenchArtBox;
  readonly outline: string;
  readonly anchor?: WorkbenchArtPoint;
  readonly sprite?: WorkbenchArtImage;
  readonly cover?: WorkbenchArtImage;
  readonly open?: WorkbenchArtImage;
}

// Measurements share the 1440 × 900 coordinate system of the selected artwork.
export const workbenchPartArt: Readonly<Record<string, WorkbenchPartArt>> = {
  "drawer-0": {
    hit: [1007, 490, 139, 56],
    outline: "M 1009 490 L 1144 505 L 1144 543 L 1009 527 Z",
    sprite: {
      src: "/assets/workbench-2d/drawer-0-sprite.webp",
      box: [1007, 490, 139, 56],
    },
    cover: {
      src: "/assets/workbench-2d/drawer-0-cover.webp",
      box: [1007, 490, 139, 56],
    },
    open: {
      src: "/assets/workbench-2d/drawer-0-open.webp",
      box: [975, 488, 171, 71],
    },
  },
  "drawer-1": {
    hit: [1007, 522, 139, 54],
    outline: "M 1009 525 L 1144 540 L 1144 574 L 1009 559 Z",
    sprite: {
      src: "/assets/workbench-2d/drawer-1-sprite.webp",
      box: [1007, 522, 139, 54],
    },
    cover: {
      src: "/assets/workbench-2d/drawer-1-cover.webp",
      box: [1007, 522, 139, 54],
    },
    open: {
      src: "/assets/workbench-2d/drawer-1-open.webp",
      box: [975, 523, 171, 67],
    },
  },
  "drawer-2": {
    hit: [1007, 557, 139, 94],
    outline: "M 1009 558 L 1144 572 L 1144 649 L 1009 635 Z",
    sprite: {
      src: "/assets/workbench-2d/drawer-2-sprite.webp",
      box: [1007, 557, 139, 94],
    },
    cover: {
      src: "/assets/workbench-2d/drawer-2-cover.webp",
      box: [1007, 557, 139, 94],
    },
    open: {
      src: "/assets/workbench-2d/drawer-2-open.webp",
      box: [975, 556, 171, 109],
    },
  },
  stool: {
    hit: [812, 525, 149, 185],
    outline:
      "M 837 541 C 836 532 857 525 883 525 C 911 524 933 533 936 541 L 936 556 C 933 569 847 573 837 555 Z",
    anchor: [888, 704],
    sprite: {
      src: "/assets/workbench-2d/stool-sprite.webp",
      box: [809, 521, 155, 192],
    },
    cover: {
      src: "/assets/workbench-2d/stool-cover.webp",
      box: [798, 512, 180, 217],
    },
  },
  "leaf-0": {
    hit: [758, 93, 65, 45],
    outline:
      "M 759 112 L 765 104 L 765 92 L 813 90 L 826 98 L 826 111 L 817 122 L 811 128 L 804 133 L 803 143 L 795 143 L 792 133 L 786 130 L 772 132 L 771 120 L 758 118 Z",
    anchor: [799, 142],
    sprite: {
      src: "/assets/workbench-2d/leaf-0-sprite.webp",
      box: [755, 90, 72, 53],
    },
    cover: {
      src: "/assets/workbench-2d/leaf-0-cover.webp",
      box: [755, 90, 72, 53],
    },
  },
  "leaf-1": {
    hit: [752, 127, 52, 36],
    outline:
      "M 751 151 L 759 141 L 760 130 L 775 124 L 786 125 L 792 133 L 795 143 L 804 151 L 809 166 L 800 167 L 791 156 L 779 166 L 752 166 Z",
    anchor: [804, 166],
    sprite: {
      src: "/assets/workbench-2d/leaf-1-sprite.webp",
      box: [750, 123, 60, 44],
    },
    cover: {
      src: "/assets/workbench-2d/leaf-1-cover.webp",
      box: [750, 123, 60, 44],
    },
  },
  "leaf-2": {
    hit: [812, 111, 55, 52],
    outline:
      "M 819 116 L 830 109 L 849 110 L 851 118 L 842 124 L 824 128 L 837 133 L 849 130 L 869 144 L 869 152 L 853 148 L 841 149 L 848 156 L 849 165 L 830 159 L 818 155 L 812 166 L 803 166 L 800 149 L 804 143 L 805 132 L 815 125 Z",
    anchor: [808, 165],
    sprite: {
      src: "/assets/workbench-2d/leaf-2-sprite.webp",
      box: [800, 107, 70, 60],
    },
    cover: {
      src: "/assets/workbench-2d/leaf-2-cover.webp",
      box: [800, 107, 70, 60],
    },
  },
  "pliers-0": {
    hit: [797, 262, 23, 69],
    outline: "M 797 262 L 820 262 L 820 331 L 797 331 Z",
    anchor: [808, 268],
    sprite: {
      src: "/assets/workbench-2d/pliers-0-sprite.webp",
      box: [797, 262, 23, 69],
    },
    cover: {
      src: "/assets/workbench-2d/pliers-0-cover.webp",
      box: [797, 262, 23, 69],
    },
  },
  "pliers-1": {
    hit: [824, 263, 25, 69],
    outline: "M 824 263 L 849 263 L 849 332 L 824 332 Z",
    anchor: [835, 268],
    sprite: {
      src: "/assets/workbench-2d/pliers-1-sprite.webp",
      box: [824, 263, 25, 69],
    },
    cover: {
      src: "/assets/workbench-2d/pliers-1-cover.webp",
      box: [824, 263, 25, 69],
    },
  },
  "driver-0": {
    hit: [855, 264, 11, 64],
    outline: "M 855 264 L 866 264 L 866 328 L 855 328 Z",
    anchor: [860, 269],
    sprite: {
      src: "/assets/workbench-2d/driver-0-sprite.webp",
      box: [855, 264, 11, 64],
    },
    cover: {
      src: "/assets/workbench-2d/driver-0-cover.webp",
      box: [855, 264, 11, 64],
    },
  },
  "driver-1": {
    hit: [872, 263, 11, 70],
    outline: "M 872 263 L 883 263 L 883 333 L 872 333 Z",
    anchor: [877, 270],
    sprite: {
      src: "/assets/workbench-2d/driver-1-sprite.webp",
      box: [872, 263, 11, 70],
    },
    cover: {
      src: "/assets/workbench-2d/driver-1-cover.webp",
      box: [872, 263, 11, 70],
    },
  },
  "wrench-0": {
    hit: [891, 268, 15, 68],
    outline: "M 891 268 L 906 268 L 906 336 L 891 336 Z",
    anchor: [898, 273],
    sprite: {
      src: "/assets/workbench-2d/wrench-0-sprite.webp",
      box: [891, 268, 15, 68],
    },
    cover: {
      src: "/assets/workbench-2d/wrench-0-cover.webp",
      box: [891, 268, 15, 68],
    },
  },
  "wrench-1": {
    hit: [903, 269, 14, 58],
    outline: "M 903 269 L 917 269 L 917 327 L 903 327 Z",
    anchor: [909, 275],
    sprite: {
      src: "/assets/workbench-2d/wrench-1-sprite.webp",
      box: [903, 269, 14, 58],
    },
    cover: {
      src: "/assets/workbench-2d/wrench-1-cover.webp",
      box: [903, 269, 14, 58],
    },
  },
  "wrench-2": {
    hit: [918, 268, 13, 52],
    outline: "M 918 268 L 931 268 L 931 320 L 918 320 Z",
    anchor: [924, 274],
    sprite: {
      src: "/assets/workbench-2d/wrench-2-sprite.webp",
      box: [918, 268, 13, 52],
    },
    cover: {
      src: "/assets/workbench-2d/wrench-2-cover.webp",
      box: [918, 268, 13, 52],
    },
  },
  "wrench-3": {
    hit: [930, 268, 13, 49],
    outline: "M 930 268 L 943 268 L 943 317 L 930 317 Z",
    anchor: [937, 274],
    sprite: {
      src: "/assets/workbench-2d/wrench-3-sprite.webp",
      box: [930, 268, 13, 49],
    },
    cover: {
      src: "/assets/workbench-2d/wrench-3-cover.webp",
      box: [930, 268, 13, 49],
    },
  },
  "wrench-4": {
    hit: [946, 265, 12, 54],
    outline: "M 946 265 L 958 265 L 958 319 L 946 319 Z",
    anchor: [951, 274],
    sprite: {
      src: "/assets/workbench-2d/wrench-4-sprite.webp",
      box: [946, 265, 12, 54],
    },
    cover: {
      src: "/assets/workbench-2d/wrench-4-cover.webp",
      box: [946, 265, 12, 54],
    },
  },
  "hammer-0": {
    hit: [975, 270, 23, 64],
    outline: "M 975 270 L 998 270 L 998 334 L 975 334 Z",
    anchor: [985, 276],
    sprite: {
      src: "/assets/workbench-2d/hammer-0-sprite.webp",
      box: [975, 270, 23, 64],
    },
    cover: {
      src: "/assets/workbench-2d/hammer-0-cover.webp",
      box: [975, 270, 23, 64],
    },
  },
  "driver-2": {
    hit: [1007, 267, 14, 55],
    outline: "M 1007 267 L 1021 267 L 1021 322 L 1007 322 Z",
    anchor: [1013, 274],
    sprite: {
      src: "/assets/workbench-2d/driver-2-sprite.webp",
      box: [1007, 267, 14, 55],
    },
    cover: {
      src: "/assets/workbench-2d/driver-2-cover.webp",
      box: [1007, 267, 14, 55],
    },
  },
  "hammer-1": {
    hit: [1133, 268, 42, 71],
    outline: "M 1133 268 L 1175 268 L 1175 339 L 1133 339 Z",
    anchor: [1153, 274],
    sprite: {
      src: "/assets/workbench-2d/hammer-1-sprite.webp",
      box: [1133, 268, 42, 71],
    },
    cover: {
      src: "/assets/workbench-2d/hammer-1-cover.webp",
      box: [1133, 268, 42, 71],
    },
  },
  "driver-3": {
    hit: [1155, 306, 14, 49],
    outline: "M 1155 306 L 1169 306 L 1169 355 L 1155 355 Z",
    anchor: [1161, 310],
    sprite: {
      src: "/assets/workbench-2d/driver-3-sprite.webp",
      box: [1155, 306, 14, 49],
    },
    cover: {
      src: "/assets/workbench-2d/driver-3-cover.webp",
      box: [1155, 306, 14, 49],
    },
  },
  "driver-4": {
    hit: [1172, 303, 13, 50],
    outline: "M 1172 303 L 1185 303 L 1185 353 L 1172 353 Z",
    anchor: [1178, 307],
    sprite: {
      src: "/assets/workbench-2d/driver-4-sprite.webp",
      box: [1172, 303, 13, 50],
    },
    cover: {
      src: "/assets/workbench-2d/driver-4-cover.webp",
      box: [1172, 303, 13, 50],
    },
  },
  "case-base": {
    hit: [710, 489, 137, 78],
    outline:
      "M 711 513 L 717 509 L 759 493 L 774 495 L 837 503 L 843 508 L 846 520 L 843 534 L 836 548 L 832 558 L 802 566 L 721 554 L 714 550 L 713 531 L 710 527 Z",
    cover: {
      src: "/assets/workbench-2d/case-base-cover.webp",
      box: [710, 489, 137, 78],
    },
    open: {
      src: "/assets/workbench-2d/case-base-open.webp",
      box: [710, 467, 134, 102],
    },
  },
  "case-lid": {
    hit: [710, 491, 137, 51],
    outline:
      "M 711 513 L 718 508 L 759 493 L 774 495 L 837 503 L 843 508 L 846 520 L 840 530 L 808 540 L 712 527 Z",
    anchor: [764, 495],
    sprite: {
      src: "/assets/workbench-2d/case-lid-sprite.webp",
      box: [710, 491, 137, 51],
    },
    cover: {
      src: "/assets/workbench-2d/case-lid-cover.webp",
      box: [710, 491, 137, 51],
    },
  },
  "case-latches": {
    hit: [723, 512, 68, 35],
    outline: "M 726 513 L 736 514 L 734 539 L 726 537 Z",
    sprite: {
      src: "/assets/workbench-2d/case-latches-sprite.webp",
      box: [723, 512, 68, 35],
    },
  },
  "lamp-diffuser": {
    hit: [856, 214, 164, 24],
    outline:
      "M 858 223 L 881 226 L 992 223 L 1007 219 L 1013 222 L 1017 228 L 994 233 L 884 235 L 862 231 Z",
    sprite: {
      src: "/assets/workbench-2d/lamp-diffuser-sprite.webp",
      box: [856, 214, 164, 24],
    },
  },
  lamp: {
    hit: [855, 211, 166, 24],
    outline: "M 855 211 L 1021 211 L 1021 235 L 855 235 Z",
  },
  "vise-handle": {
    hit: [1137, 422, 24, 49],
    outline:
      "M 1140 438 Q 1144 435 1148 439 L 1150 466 Q 1147 471 1141 468 L 1139 465 Z",
    anchor: [1144, 435],
    sprite: {
      src: "/assets/workbench-2d/vise-handle-sprite.webp",
      box: [1139, 425, 15, 45],
    },
    cover: {
      src: "/assets/workbench-2d/vise-handle-cover.webp",
      box: [1139, 425, 15, 45],
    },
  },
  "vise-slide": {
    hit: [1132, 398, 52, 37],
    outline:
      "M 1133 401 L 1143 398 L 1177 399 L 1181 402 L 1181 407 L 1171 408 L 1166 419 L 1159 426 L 1139 425 L 1141 414 L 1142 408 L 1134 406 Z",
    anchor: [1158, 423],
    sprite: {
      src: "/assets/workbench-2d/vise-slide-sprite.webp",
      box: [1132, 398, 52, 37],
    },
    cover: {
      src: "/assets/workbench-2d/vise-slide-cover.webp",
      box: [1132, 398, 52, 37],
    },
  },
  "vise-stock": {
    hit: [1152, 403, 25, 18],
    outline:
      "M 1153 410 L 1162 404.6 L 1176 406.8 L 1176 413 L 1166.5 419.3 L 1152.8 416.7 Z",
    sprite: {
      src: "/assets/workbench-2d/vise-stock-sprite.webp",
      box: [1152, 403, 25, 18],
    },
  },
  laptop: {
    hit: [744, 341, 181, 102],
    outline:
      "M 745 344 L 878 341 L 891 419 L 925 433 L 917 439 L 777 446 L 761 436 Z",
  },
  display: {
    hit: [975, 329, 148, 104],
    outline:
      "M 985 330 L 1119 332 L 1109 416 L 1061 417 L 1069 429 L 1081 431 L 1080 437 L 1011 438 L 1010 432 L 1043 426 L 1043 415 L 974 409 Z",
  },
  "laptop-screen": {
    hit: [752, 348, 133, 75],
    outline: "M 754 351 L 871 350 L 883 417 L 764 420 Z",
    cover: {
      src: "/assets/workbench-2d/laptop-screen-cover.webp",
      box: [752, 348, 133, 75],
    },
  },
  "display-screen": {
    hit: [982, 335, 131, 75],
    outline: "M 991 337 L 1111 339 L 1102 409 L 984 402 Z",
    cover: {
      src: "/assets/workbench-2d/display-screen-cover.webp",
      box: [982, 335, 131, 75],
    },
  },
  "display-key-0": {
    hit: [968, 439, 84, 13],
    outline: "M 970 444 L 985 438 L 1049 442 L 1042 451 L 969 448 Z",
  },
  "mouse-left": {
    hit: [1057, 443, 22, 13],
    outline:
      "M 1058 451 L 1062 447 L 1068 444 L 1074 444 L 1077 449 L 1074 454 L 1059 455 Z",
    sprite: {
      src: "/assets/workbench-2d/mouse-left-sprite.webp",
      box: [1057, 443, 22, 13],
    },
  },
  "mouse-right": {
    hit: [1072, 443, 17, 13],
    outline:
      "M 1073 444 L 1085 445 L 1088 449 L 1084 453 L 1073 455 L 1075 451 Z",
    sprite: {
      src: "/assets/workbench-2d/mouse-right-sprite.webp",
      box: [1072, 443, 17, 13],
    },
  },
};
