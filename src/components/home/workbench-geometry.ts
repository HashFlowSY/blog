import type { DrawingStage, PencilPoint } from "./pencil-plan";

type TimeSpan = readonly [fromMs: number, toMs: number];

interface MarkStyle {
  color?: string;
  opacity?: number;
  fade?: TimeSpan;
  clip?: string;
  pen?: boolean;
  overTexture?: boolean;
}

type MarkTiming = MarkStyle & { fromMs: number; toMs: number };
type DrawingMark = MarkTiming & { id: string; stage: DrawingStage } & (
    | { kind: "point"; point: PencilPoint }
    | { kind: "stroke"; path: string; width: number }
    | { kind: "tone"; path: string }
  );

interface DrawingTexture {
  id: string;
  path: string;
  fromMs: number;
  toMs: number;
}

export type { DrawingMark };

const graphite = "#504539";
const lightGraphite = "#776958";
const darkGraphite = "#3f362f";

function point(
  id: string,
  point: PencilPoint,
  [fromMs, toMs]: TimeSpan,
  fade: TimeSpan,
): DrawingMark {
  return {
    id,
    kind: "point",
    stage: "point",
    point,
    fromMs,
    toMs,
    color: graphite,
    fade,
  };
}

function stroke(
  id: string,
  stage: DrawingStage,
  [fromMs, toMs]: TimeSpan,
  width: number,
  path: string,
  style: MarkStyle = {},
): DrawingMark {
  return {
    id,
    kind: "stroke",
    stage,
    path,
    width,
    fromMs,
    toMs,
    color: graphite,
    ...style,
  };
}

function tone(
  id: string,
  stage: DrawingStage,
  [fromMs, toMs]: TimeSpan,
  opacity: number,
  path: string,
  color = graphite,
): DrawingMark {
  return {
    id,
    kind: "tone",
    stage,
    path,
    fromMs,
    toMs,
    opacity,
    color,
  };
}

function texture(
  id: string,
  [fromMs, toMs]: TimeSpan,
  path: string,
): DrawingTexture {
  return { id, path, fromMs, toMs };
}

const worktop = "M 638 436 L 746 413 L 1252 436 L 1169 476 Z";
const worktopLip =
  "M 638 436 L 1169 476 L 1252 436 L 1252 447 L 1171 489 L 638 446 Z";
const cabinetSide = "M 1178 488 L 1225 466 L 1222 612 L 1177 652 Z";
const drawer = "M 1010 562 L 1142 577 L 1142 648 L 1010 630 Z";
const pegboard = "M 780 219 L 1192 209 L 1200 431 L 782 414 Z";
const notebookScreen = "M 753 351 L 870 349 L 883 416 L 764 423 Z";
const displayScreen = "M 990 336 L 1113 337 L 1104 407 L 982 404 Z";
const caseFront =
  "M 714 517 L 793 527 L 843 513 L 842 550 L 789 564 L 713 551 Z";
const shelfShade =
  "M 775 219 L 1217 207 L 1204 247 Q 1077 232 939 247 L 773 255 Z";
const deskShade = "M 691 452 L 994 477 L 992 584 Q 888 562 791 531 L 692 506 Z";
const floorShade =
  "M 645 625 Q 697 604 775 596 Q 898 632 1003 608 Q 1106 588 1224 603 Q 1274 616 1280 652 Q 1247 691 1184 714 Q 1067 731 978 714 Q 866 721 786 677 Q 710 654 645 640 Z";

const pale: MarkStyle = { color: lightGraphite, opacity: 0.71 };
const layout: MarkStyle = { ...pale, fade: [2870, 3350] };
const rough: MarkStyle = { color: lightGraphite, opacity: 0.62 };
const ink: MarkStyle = { color: darkGraphite, opacity: 0.94 };
const fine: MarkStyle = { pen: false, opacity: 0.75 };

// Broad values sit under their contours. The lighter construction marks can
// still show through until their matching contour is established.
export const drawingMarks: readonly DrawingMark[] = [
  tone("plane-worktop-value", "plane", [1410, 1530], 0.08, worktop),
  tone("plane-front-value", "plane", [1685, 1815], 0.13, worktopLip),
  tone("plane-cabinet-value", "plane", [1845, 1985], 0.15, cabinetSide),
  tone("rough-toolboard-value", "rough", [2220, 2370], 0.06, pegboard),
  tone(
    "ink-notebook-paper",
    "ink",
    [3394, 3484],
    0.97,
    notebookScreen,
    "#ece5d2",
  ),
  tone(
    "ink-display-paper",
    "ink",
    [3544, 3645],
    0.97,
    displayScreen,
    "#eee7d3",
  ),
  tone(
    "shadow-right-foot-value",
    "shadow",
    [4585, 4750],
    0.12,
    "M 1117 663 Q 1167 632 1224 627 Q 1262 632 1235 656 Q 1216 679 1171 702 Q 1123 718 1107 689 Z",
  ),
  tone(
    "shadow-stool-foot-value",
    "shadow",
    [4750, 4900],
    0.11,
    "M 809 672 Q 843 648 902 649 Q 951 652 973 679 Q 934 714 889 713 Q 843 709 809 692 Z",
  ),
  tone(
    "shadow-left-foot-value",
    "shadow",
    [4900, 5055],
    0.12,
    "M 646 625 Q 671 611 714 618 Q 740 620 729 633 Q 697 648 647 636 Z",
  ),
  tone("shadow-under-shelf-value", "shadow", [3920, 4100], 0.15, shelfShade),
  tone("shadow-under-desk-value", "shadow", [4185, 4390], 0.14, deskShade),
  tone(
    "shadow-desk-leg-value",
    "shadow",
    [4385, 4570],
    0.21,
    "M 1159 488 L 1177 487 L 1179 689 L 1164 698 Z M 1222 468 L 1237 459 L 1237 633 L 1222 639 Z",
  ),
  tone("shadow-cabinet-value", "shadow", [4400, 4560], 0.18, cabinetSide),
  tone("shadow-case-value", "shadow", [5030, 5190], 0.23, caseFront),
  tone(
    "shadow-stool-rim",
    "shadow",
    [4710, 4875],
    0.28,
    "M 838 547 C 855 566 923 566 934 544 L 934 553 C 928 570 860 577 840 558 Z",
  ),
  tone("finish-yellow-drawer", "finish", [6247, 6350], 0.92, drawer, "#f6ca21"),

  point("point-rightFoot", [1163, 697], [38, 118], [2730, 2950]),
  stroke(
    "guide-right-leg",
    "line",
    [161, 366],
    2.4,
    "M 1163 697 Q 1167 583 1169 476",
    layout,
  ),
  stroke(
    "guide-worktop",
    "line",
    [383, 625],
    2.7,
    "M 1169 476 Q 900 455 638 436",
    layout,
  ),
  stroke(
    "guide-left-post",
    "line",
    [707, 900],
    2.24,
    "M 773 429 Q 773 324 771 216",
    { ...pale, fade: [3550, 3840] },
  ),
  stroke(
    "guide-shelf",
    "line",
    [925, 1160],
    2.5,
    "M 733 209 Q 955 204 1180 197 L 1224 205",
    { ...pale, fade: [3550, 3850] },
  ),
  stroke(
    "guide-back-post",
    "line",
    [1179, 1244],
    2.1,
    "M 1224 205 Q 1223 329 1222 436",
    { ...pale, fade: [3550, 3840] },
  ),

  stroke(
    "plane-worktop",
    "plane",
    [1267, 1407],
    2.3,
    "M 1169 476 L 1252 436 Q 996 423 746 413 Q 695 424 638 436",
    { ...pale, fade: [2870, 3170] },
  ),
  stroke(
    "plane-left-leg",
    "plane",
    [1429, 1522],
    2.25,
    "M 665 449 L 664 624 L 678 630 L 690 624 L 692 449",
    { ...pale, fade: [2900, 3210] },
  ),
  stroke(
    "plane-front",
    "plane",
    [1547, 1682],
    2.35,
    "M 638 436 L 638 446 Q 904 469 1171 489 L 1252 447 L 1252 436",
    { ...pale, fade: [2870, 3170] },
  ),
  stroke(
    "plane-cabinet",
    "plane",
    [1710, 1843],
    2.25,
    "M 1225 466 L 1222 612 L 1177 652 L 1178 488 Z",
    { ...pale, fade: [3180, 3370] },
  ),

  stroke(
    "rough-display",
    "rough",
    [1899, 2000],
    2.65,
    "M 1109 414 L 1118 333 L 986 331 L 976 409 Z",
    { ...rough, fade: [3470, 3690] },
  ),
  stroke(
    "rough-notebook",
    "rough",
    [2055, 2164],
    2.7,
    "M 921 430 L 889 419 L 875 344 L 747 346 L 758 427 L 785 441 Z",
    { ...rough, fade: [3310, 3550] },
  ),
  stroke(
    "rough-tools",
    "rough",
    [2209, 2311],
    2.25,
    "M 799 329 Q 793 304 805 286 Q 797 270 807 265 Q 821 265 814 287 Q 829 311 820 325",
    { ...rough, fade: [3720, 3940] },
  ),
  stroke(
    "rough-pot",
    "rough",
    [2355, 2418],
    2.4,
    "M 784 172 C 786 161 823 161 828 170 C 827 177 794 182 784 172 L 791 202 L 819 202 L 828 171",
    { ...rough, fade: [3730, 3970] },
  ),
  stroke(
    "rough-case",
    "rough",
    [2488, 2547],
    2.25,
    "M 714 510 L 755 493 L 825 500 L 843 516 L 841 548 L 789 563 L 715 550 Z",
    { ...rough, fade: [2700, 2960] },
  ),
  stroke(
    "rough-stool",
    "rough",
    [2577, 2644],
    2.7,
    "M 836 544 C 836 515 933 522 937 543 C 939 562 844 574 836 544 Z",
    { ...rough, fade: [2670, 2820] },
  ),

  stroke(
    "ink-worktop",
    "ink",
    [2840, 2990],
    2.9,
    "M 637 436 L 637 446 Q 903 468 1171 488 L 1251 446 L 1251 437 L 1168 476",
    ink,
  ),
  stroke(
    "ink-right-leg",
    "ink",
    [3007, 3091],
    2.65,
    "M 1177 486 L 1179 689 L 1164 698 L 1150 691 Q 1148 591 1148 486",
    ink,
  ),
  stroke(
    "ink-cabinet",
    "ink",
    [3108, 3215],
    2.3,
    "M 1146 495 L 1008 483 L 1008 630 L 1142 648 L 1147 661 L 994 641 L 995 479",
    ink,
  ),
  stroke(
    "ink-notebook",
    "ink",
    [3263, 3390],
    2.8,
    "M 922 427 L 892 417 L 880 349 Q 879 342 874 342 L 755 344 Q 749 343 747 346 L 759 431 L 786 443 L 923 434 Z",
    ink,
  ),
  stroke(
    "ink-display",
    "ink",
    [3421, 3540],
    2.9,
    "M 973 410 L 984 331 Q 986 329 992 330 L 1117 332 Q 1120 332 1120 335 L 1111 414 Z",
    ink,
  ),
  stroke(
    "ink-stool",
    "ink",
    [2660, 2778],
    2.65,
    "M 837 545 C 838 534 859 527 884 526 C 912 524 935 532 935 543 C 935 554 911 562 882 563 C 859 565 836 558 837 545 Z",
    ink,
  ),
  stroke(
    "ink-shelf",
    "ink",
    [3708, 3840],
    2.45,
    "M 733 207 L 733 217 Q 961 210 1180 205 L 1226 213 L 1226 202",
    ink,
  ),
  stroke(
    "ink-tools",
    "ink",
    [3575, 3665],
    2.08,
    "M 899 280 Q 897 273 903 271 L 903 277 Q 907 280 910 275 L 910 271 Q 916 275 911 284 L 909 330 Q 913 335 908 340 Q 902 343 900 337 Q 899 334 902 330 L 904 285 Q 899 283 899 280 Z",
    ink,
  ),
  stroke(
    "ink-worktop-separation",
    "ink",
    [2855, 3045],
    1.45,
    "M 638 435 Q 899 454 1168 476 M 638 435 L 747 413 M 918 421 L 973 423 M 1058 427 L 1131 433 M 1186 434 L 1251 436 M 647 442 Q 914 461 1168 482 L 1245 444",
    fine,
  ),
  stroke(
    "ink-left-and-back-legs",
    "ink",
    [2910, 3178],
    2.1,
    "M 665 450 L 664 624 L 677 631 L 691 624 L 692 451 M 675 451 L 675 625 M 1222 469 L 1221 635 L 1236 642 L 1240 635 L 1238 459 M 1163 488 L 1164 693 M 691 469 L 730 477 L 691 505 Z",
    fine,
  ),
  stroke(
    "ink-cabinet-side-edges",
    "ink",
    [3118, 3320],
    1.95,
    "M 1178 488 L 1225 467 L 1222 613 L 1178 650 M 1183 497 L 1217 480 L 1215 607 L 1183 635 M 1002 481 L 1001 640 M 1141 650 L 1145 661",
    fine,
  ),
  stroke(
    "ink-drawer-seams",
    "ink",
    [3178, 3340],
    1.97,
    "M 1010 491 L 1142 502 L 1142 648 L 1010 631 Z M 1010 499 L 1142 511 M 1010 526 L 1142 540 M 1010 534 L 1142 548 M 1010 560 L 1142 574 M 1010 567 L 1142 581 M 1051 505 L 1052 510 L 1090 513 L 1092 508 M 1053 538 L 1054 544 L 1095 548 L 1096 543 M 1053 570 L 1053 576 L 1094 581 L 1097 575",
    fine,
  ),
  stroke(
    "ink-notebook-details",
    "ink",
    [3320, 3470],
    1.6,
    "M 754 351 L 870 349 L 884 416 L 764 423 Z M 765 425 L 890 420 L 913 428 L 786 438 Z M 775 428 L 891 423 M 779 430 L 897 425 M 784 433 L 904 427 M 821 430 L 860 428 L 869 432 L 829 434 Z",
    fine,
  ),
  stroke(
    "ink-display-details",
    "ink",
    [3472, 3610],
    1.65,
    "M 991 336 L 1113 338 L 1105 407 L 981 404 Z M 1034 412 L 1034 426 L 1011 430 L 1009 434 L 1017 438 L 1074 437 L 1074 430 L 1056 427 L 1056 413 M 973 439 L 1055 440 L 1043 452 L 962 449 Z M 1061 450 Q 1072 440 1083 445 Q 1092 449 1083 455 L 1061 454 Z",
    fine,
  ),
  stroke(
    "ink-stool-rim-and-ring",
    "ink",
    [2715, 2940],
    2.25,
    "M 837 547 L 840 557 C 852 571 918 574 932 554 L 935 544 M 878 565 L 878 573 L 885 578 L 885 631 L 896 634 L 899 576 L 903 571 L 902 565 M 829 631 C 831 606 947 600 945 626 C 944 651 828 660 829 631 Z M 837 632 C 837 615 937 608 937 627 C 938 644 835 654 837 632 Z M 889 641 L 890 651 L 817 677 L 814 684 L 826 685 L 831 679 L 897 655 L 949 679 L 959 677 L 954 669 L 901 649 L 897 698 L 892 708 L 886 704 L 887 665",
    fine,
  ),
  stroke(
    "ink-pegboard-frame-and-light",
    "ink",
    [3730, 3970],
    2.0,
    "M 771 216 L 772 342 M 779 222 L 781 340 M 1196 214 L 1201 430 M 1213 215 L 1215 432 M 1223 215 L 1224 432 M 770 219 Q 778 244 786 251 M 1198 211 Q 1205 231 1213 243 M 854 225 L 871 219 L 999 217 L 1019 220 L 1019 229 L 1001 225 L 868 232 L 854 229 Z",
    fine,
  ),
  stroke(
    "ink-case-and-lower-shelf",
    "ink",
    [2678, 2905],
    1.9,
    "M 695 553 L 715 549 M 843 548 L 856 549 L 855 562 L 821 582 L 694 566 L 695 553 M 714 520 L 714 508 L 754 494 L 826 498 L 843 512 L 843 548 L 789 563 L 714 552 Z M 717 515 L 790 524 L 842 512 M 721 530 L 790 540 L 838 526 M 738 535 L 737 543 L 750 545 L 752 539 M 772 540 L 772 548 L 785 549 L 786 543 M 747 550 Q 760 558 774 553 M 747 579 L 748 591 L 778 596 L 780 586",
    fine,
  ),
  stroke(
    "ink-shelf-storage",
    "ink",
    [3760, 4040],
    1.8,
    "M 826 175 L 866 170 L 877 177 L 876 200 L 826 203 Z M 830 177 L 875 175 M 844 179 L 855 179 L 855 185 L 844 186 Z M 873 173 L 931 170 L 949 177 L 948 197 L 873 200 Z M 877 179 L 947 177 M 886 180 L 903 179 L 904 184 L 887 185 Z M 1056 195 L 1064 142 L 1073 141 L 1068 195 M 1075 195 L 1081 131 L 1090 130 L 1093 195 M 1096 194 L 1096 128 L 1105 130 L 1109 194 M 1110 194 L 1109 135 L 1118 137 L 1121 194 M 1116 194 L 1116 151 L 1183 146 L 1211 155 L 1212 196 L 1182 194 Z M 1118 161 L 1181 154 L 1182 193 M 1119 169 L 1181 163 M 1119 180 L 1182 174 M 1119 190 L 1182 184",
    fine,
  ),
  stroke(
    "ink-plant",
    "ink",
    [3750, 4005],
    1.55,
    "M 783 173 C 781 164 824 160 828 169 C 830 177 789 181 783 173 L 791 202 Q 803 207 820 201 L 828 169 M 799 165 Q 800 141 785 118 L 775 105 M 805 166 Q 802 129 833 113 M 800 158 Q 781 146 759 152 M 809 163 Q 823 137 846 138 M 787 122 Q 772 108 760 116 Q 771 120 782 119 M 776 105 Q 782 93 799 102 Q 787 110 776 105 Z M 798 127 Q 807 108 818 108 Q 816 120 798 127 Z M 821 125 Q 826 110 844 115 Q 837 125 821 125 Z M 792 145 Q 775 128 765 139 Q 775 145 792 145 Z M 775 153 Q 762 146 753 158 Q 764 157 775 153 Z M 824 147 Q 833 131 850 134 Q 852 139 861 143 Q 840 145 824 147 Z M 824 150 Q 838 148 848 161 Q 831 161 824 150 Z",
    fine,
  ),
  stroke(
    "ink-hand-tools",
    "ink",
    [3605, 3840],
    1.9,
    "M 806 265 Q 798 270 804 283 Q 798 296 796 321 Q 796 329 801 328 Q 806 325 808 303 L 811 294 Q 813 319 819 327 Q 824 329 824 323 Q 821 300 814 285 Q 820 273 813 266 L 811 282 Z M 841 275 L 845 333 M 860 273 L 862 327 M 876 270 L 878 321 M 921 275 L 919 332 M 934 273 L 934 329 M 947 273 L 947 316 M 959 272 L 957 315 M 979 276 Q 1001 268 997 281 L 990 283 L 990 327 L 985 329 L 983 283 Z M 1014 272 L 1015 325 M 1064 288 L 1098 288 L 1094 317 Q 1081 327 1068 317 Z M 1071 286 L 1068 269 M 1077 286 L 1077 273 M 1085 286 L 1088 270 M 1092 286 L 1098 279 M 1134 274 L 1168 273 Q 1178 276 1171 282 L 1153 284 L 1152 361 Q 1148 369 1144 361 L 1143 284 Z M 1165 282 L 1167 338 M 1180 283 L 1181 346",
    fine,
  ),

  stroke(
    "shadow-under-shelf",
    "shadow",
    [3860, 4020],
    3.9,
    "M 1194 216 Q 1084 219 972 222 Q 884 226 790 228",
    { opacity: 0.6, clip: shelfShade },
  ),
  stroke(
    "shadow-under-worktop",
    "shadow",
    [4100, 4290],
    2.7,
    "M 696 470 L 714 456 Q 718 454 722 456 L 709 480 Q 706 484 713 482 L 747 460 Q 752 457 757 460 L 743 488 Q 742 493 749 490 L 790 464 Q 795 461 799 465 L 790 501 Q 789 506 797 502 L 848 469 Q 853 466 857 470 L 845 516 Q 843 521 851 517 L 910 475 Q 916 472 920 476 L 910 535 Q 908 540 916 535 L 983 484",
    { opacity: 0.66, clip: deskShade },
  ),
  stroke(
    "shadow-cabinet-hatching",
    "shadow",
    [4335, 4475],
    2.5,
    "M 1182 511 L 1221 480 Q 1225 479 1222 487 L 1182 527 Q 1179 531 1183 534 L 1221 501 Q 1224 499 1222 507 L 1183 549 Q 1180 554 1184 557 L 1220 526 Q 1224 523 1221 532 L 1183 575",
    { opacity: 0.7, clip: cabinetSide },
  ),
  stroke(
    "shadow-foot-contact",
    "shadow",
    [4512, 4625],
    3.45,
    "M 1215 680 Q 1196 691 1166 698 Q 1142 697 1127 686",
    { opacity: 0.72, clip: floorShade },
  ),
  stroke(
    "shadow-stool-contact",
    "shadow",
    [4676, 4800],
    3.0,
    "M 950 685 Q 920 706 894 709 Q 855 705 826 687",
    { opacity: 0.57, clip: floorShade },
  ),
  stroke(
    "shadow-left-foot",
    "shadow",
    [4844, 4950],
    2.8,
    "M 716 627 Q 703 634 680 635 Q 666 637 649 632",
    { opacity: 0.68, clip: floorShade },
  ),
  stroke(
    "shadow-toolbox",
    "shadow",
    [4988, 5090],
    2.35,
    "M 716 538 Q 751 544 786 550 L 837 535 Q 842 533 840 542 L 787 559 L 717 549",
    { opacity: 0.6, clip: caseFront },
  ),
  stroke(
    "shadow-behind-light",
    "shadow",
    [3905, 4075],
    1.45,
    "M 777 234 L 802 216 M 790 241 L 824 217 M 813 241 L 846 217 M 842 239 L 870 217 M 878 236 L 903 216 M 919 234 L 944 214 M 967 232 L 990 211 M 1030 232 L 1059 210 M 1070 235 L 1101 209 M 1115 236 L 1147 208 M 1156 237 L 1191 207 M 1185 238 L 1210 213",
    { pen: false, opacity: 0.45, clip: shelfShade },
  ),
  stroke(
    "shadow-slab-and-wall",
    "shadow",
    [4190, 4370],
    1.35,
    "M 698 488 L 732 455 M 712 504 L 762 458 M 738 504 L 791 460 M 765 513 L 818 462 M 791 514 L 847 465 M 817 522 L 876 467 M 842 527 L 904 470 M 873 542 L 934 472 M 900 552 L 960 474 M 928 555 L 988 478 M 955 552 L 995 501",
    { pen: false, opacity: 0.38, clip: deskShade },
  ),
  stroke(
    "shadow-side-grain",
    "shadow",
    [4360, 4545],
    1.35,
    "M 1180 518 L 1225 486 M 1179 532 L 1224 499 M 1179 546 L 1223 510 M 1180 561 L 1222 522 M 1181 576 L 1221 534 M 1180 593 L 1221 549 M 1180 608 L 1220 565 M 1181 624 L 1221 579 M 1181 641 L 1221 594 M 1184 648 L 1224 607",
    { pen: false, opacity: 0.64, clip: cabinetSide },
  ),
  stroke(
    "shadow-case-grain",
    "shadow",
    [5010, 5150],
    1.45,
    "M 714 537 L 788 548 L 842 534 M 715 543 L 790 553 L 842 540 M 717 549 L 790 559 L 841 545 M 729 523 L 728 554 M 764 527 L 762 560 M 819 521 L 818 554",
    { pen: false, opacity: 0.5, clip: caseFront },
  ),
  stroke(
    "shadow-vise",
    "shadow",
    [5195, 5340],
    2.35,
    "M 1131 459 L 1133 447 L 1140 444 L 1140 432 L 1151 427 L 1147 409 L 1136 405 L 1138 400 L 1172 400 L 1178 407 L 1172 413 L 1177 424 L 1188 422 L 1191 451 L 1178 459 Z",
    ink,
  ),

  stroke(
    "finish-yellow-pencil",
    "finish",
    [5890, 5998],
    27,
    "M 1017 574 Q 1068 584 1137 590",
    { color: "#ecc124", opacity: 0.86, clip: drawer },
  ),
  stroke(
    "finish-yellow-second",
    "finish",
    [6016, 6123],
    28,
    "M 1137 612 Q 1074 603 1017 595",
    { color: "#f4c81e", opacity: 0.9, clip: drawer },
  ),
  stroke(
    "finish-yellow-third",
    "finish",
    [6144, 6244],
    30,
    "M 1017 621 Q 1083 628 1137 636",
    { color: "#e9b91b", opacity: 0.89, clip: drawer },
  ),
  stroke(
    "finish-notebook-study",
    "finish",
    [5440, 5600],
    1.35,
    "M 778 396 L 812 369 L 842 390 L 812 412 L 778 396 L 778 403 L 812 418 L 842 398 L 842 390",
    { color: lightGraphite, opacity: 0.67, clip: notebookScreen },
  ),
  stroke(
    "finish-display-study",
    "finish",
    [5665, 5825],
    1.65,
    "M 1047 351 C 1059 351 1065 359 1065 369 C 1065 379 1057 387 1046 387 C 1036 387 1028 380 1028 370 C 1028 360 1037 352 1047 351",
    { color: graphite, opacity: 0.74, clip: displayScreen },
  ),
  stroke(
    "finish-table-edge-light",
    "finish",
    [6298, 6428],
    1.6,
    "M 1089 478 Q 1126 480 1169 485 L 1243 449",
    {
      color: "#fff4d8",
      opacity: 0.68,
      fade: [6420, 6450],
      overTexture: true,
    },
  ),
  stroke(
    "finish-yellow-local-grain",
    "finish",
    [6245, 6370],
    2.7,
    "M 1013 575 L 1143 590 M 1013 583 L 1143 598 M 1013 591 L 1143 606 M 1013 600 L 1143 616 M 1013 608 L 1143 624 M 1013 616 L 1143 634 M 1013 624 L 1143 642",
    { color: "#c99d23", pen: false, opacity: 0.4, clip: drawer },
  ),
];

// Each window restores the original paper grain or fine hatching on a surface
// that is already present. Its outline follows the relevant object or occluder.
export const drawingTextures: readonly DrawingTexture[] = [
  texture(
    "left-notebook-frame",
    [3430, 3810],
    "M 739 343 L 880 337 L 896 415 L 926 424 L 926 437 L 785 447 L 755 433 Z M 754 352 L 764 419 L 881 415 L 870 350 Z",
  ),
  texture(
    "right-display-frame",
    [3560, 3980],
    "M 981 327 L 1125 328 L 1114 418 L 1059 418 L 1059 425 L 1078 429 L 1079 439 L 1011 441 L 1006 436 L 1008 428 L 1030 423 L 1030 415 L 970 414 Z M 991 337 L 984 403 L 1103 406 L 1110 338 Z",
  ),
  texture(
    "storage-shelf-edge",
    [3865, 4150],
    "M 727 204 L 1182 190 L 1232 199 L 1235 217 L 1183 211 L 733 224 Z",
  ),
  texture(
    "upper-drafting-guides",
    [4150, 4620],
    "M 625 82 H 751 V 103 L 744 199 L 710 213 H 625 Z M 859 82 H 1255 V 119 L 1234 142 L 1217 137 L 1121 120 L 1067 121 L 1049 190 L 958 195 L 957 165 L 873 162 L 865 128 Z",
  ),
  texture(
    "upper-storage",
    [3990, 4350],
    "M 821 171 L 932 164 L 952 174 L 953 201 L 821 207 Z M 1053 196 L 1060 137 L 1074 137 L 1081 125 L 1110 126 L 1120 136 L 1121 146 L 1185 141 L 1218 153 L 1217 199 Z",
  ),
  texture(
    "upper-plant-leaves",
    [4030, 4460],
    "M 751 163 Q 743 152 755 143 L 763 131 L 756 116 Q 757 108 770 105 Q 765 91 782 90 L 807 97 L 820 100 L 833 108 Q 848 105 850 118 L 843 128 L 859 132 L 869 149 L 855 153 L 853 164 L 825 159 L 828 169 L 823 204 L 787 209 L 780 173 L 778 162 Z",
  ),
  texture(
    "worktop-face",
    [4210, 4630],
    "M 635 434 L 744 409 L 756 429 L 785 446 L 926 436 L 926 421 L 969 422 L 1001 442 L 1052 444 L 1080 430 L 1125 432 L 1132 460 L 1178 463 L 1193 449 L 1189 432 L 1254 434 L 1255 450 L 1171 493 L 635 449 Z",
  ),
  texture(
    "pegboard-light-and-right-upright",
    [3990, 4410],
    "M 765 214 L 785 214 L 788 344 L 768 346 Z M 848 216 L 998 212 L 1023 217 L 1023 235 L 853 236 Z M 1189 208 L 1232 207 L 1229 434 L 1194 434 Z",
  ),
  texture(
    "pegboard-shelf-contact",
    [4025, 4430],
    "M 768 210 L 1185 200 L 1227 207 L 1225 249 Q 1103 237 1011 249 Q 893 238 779 258 Z",
  ),
  texture(
    "upper-tools-and-peg-holes",
    [4140, 4700],
    "M 786 235 Q 996 219 1194 225 L 1199 428 L 1191 427 L 1176 393 L 1134 395 L 1128 428 L 1116 428 L 1124 328 L 981 324 L 968 415 L 896 416 L 879 337 L 785 342 Z",
  ),
  texture(
    "toolbox-and-lower-shelf",
    [5080, 5580],
    "M 688 550 L 708 546 L 708 506 L 754 490 L 826 493 L 845 507 L 848 546 L 860 546 L 860 567 L 824 586 L 780 590 L 781 598 L 748 597 L 741 574 L 688 572 Z",
  ),
  texture(
    "under-worktop-wood-and-wall",
    [4265, 4820],
    "M 682 449 L 996 475 L 995 608 Q 969 607 948 615 L 908 602 L 906 575 Q 936 568 942 549 Q 945 522 899 520 Q 868 519 847 532 L 847 506 L 825 493 L 753 488 L 706 504 L 705 547 L 686 550 Z",
  ),
  texture(
    "left-brace-and-rear-strut",
    [4940, 5370],
    "M 650 441 L 734 453 L 795 479 L 786 500 L 764 502 L 738 489 L 695 520 L 695 556 L 668 553 Z M 691 566 L 774 574 L 792 589 L 777 607 L 713 603 L 687 591 Z",
  ),
  texture(
    "under-screen-stands",
    [3630, 4110],
    "M 897 413 L 968 414 L 981 424 L 1007 424 L 1022 419 L 1101 416 L 1121 423 L 1122 444 L 1076 446 L 1014 439 L 979 441 L 935 434 Z",
  ),
  texture(
    "cabinet-side-and-legs",
    [4480, 5030],
    "M 657 448 L 695 450 L 697 624 L 681 635 L 658 630 Z M 1143 484 L 1250 450 L 1245 641 L 1223 648 L 1184 658 L 1184 695 L 1164 704 L 1146 697 Z",
  ),
  texture(
    "cabinet-shadow-on-paper",
    [4640, 5200],
    "M 1237 446 Q 1250 433 1267 434 L 1306 448 L 1306 601 Q 1280 636 1227 655 L 1219 622 L 1235 579 Z",
  ),
  texture(
    "right-drafting-guides",
    [4800, 5260],
    "M 1240 120 H 1440 V 610 L 1312 604 L 1286 558 L 1272 433 L 1240 422 Z",
  ),
  texture(
    "cabinet-gray-fronts",
    [4490, 4900],
    "M 989 474 L 1152 487 L 1152 667 L 990 644 Z M 1006 556 L 1006 635 L 1147 653 L 1148 573 Z",
  ),
  texture(
    "stool",
    [4840, 5250],
    "M 831 539 Q 848 521 888 522 Q 932 522 940 538 Q 945 561 903 574 L 902 606 Q 950 601 950 628 Q 948 645 919 652 L 961 670 L 961 683 L 946 685 L 905 662 L 900 706 L 891 714 L 881 708 L 883 664 L 829 686 L 809 690 L 810 677 L 852 652 Q 824 649 824 632 Q 825 610 880 605 L 881 573 Q 831 573 831 539 Z",
  ),
  texture(
    "right-floor-contact",
    [4650, 5200],
    "M 958 625 Q 972 608 990 604 L 990 644 L 1146 668 L 1147 697 L 1164 704 L 1183 695 L 1183 656 L 1222 644 L 1238 644 L 1245 635 L 1247 580 Q 1303 577 1320 623 Q 1341 655 1302 690 Q 1244 733 1160 747 L 984 751 L 942 705 Z",
  ),
  texture(
    "stool-floor-contact",
    [4790, 5345],
    "M 734 589 Q 798 587 824 567 L 914 568 L 969 599 L 996 608 L 1038 669 L 1059 736 Q 931 777 828 746 L 742 692 Z",
  ),
  texture(
    "left-floor-contact",
    [4920, 5470],
    "M 537 570 L 587 528 L 609 435 L 655 412 L 658 580 L 688 571 L 742 573 L 787 597 L 807 624 L 845 689 Q 808 727 747 715 L 650 694 L 553 687 Z",
  ),
  texture(
    "yellow-drawer-pigment",
    [6255, 6420],
    "M 1003 554 L 1151 571 L 1150 658 L 1002 637 Z",
  ),
  texture(
    "notebook-study",
    [5600, 5800],
    "M 751 348 L 874 347 L 888 421 L 761 426 Z",
  ),
  texture(
    "display-study",
    [5825, 6040],
    "M 989 334 L 1116 335 L 1107 410 L 978 406 Z",
  ),
  texture(
    "keyboard-and-mouse-on-table",
    [3620, 4095],
    "M 957 434 L 1060 434 L 1090 440 L 1092 460 L 956 455 Z",
  ),
  texture(
    "tabletop-pencil",
    [4410, 4750],
    "M 908 436 L 969 429 L 970 442 L 913 453 Z",
  ),
  texture(
    "tabletop-vise",
    [5330, 5630],
    "M 1127 401 L 1140 394 L 1175 395 L 1194 416 L 1197 457 L 1181 468 L 1128 467 Z",
  ),
];
