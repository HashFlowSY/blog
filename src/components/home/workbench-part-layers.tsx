import { useId } from "react";

import { assetPath } from "@/lib/site";

import { pencilEase } from "./pencil-plan";
import { workbenchPartArt } from "./workbench-art";
import { drawerActions } from "./workbench-parts";

import type { WorkbenchArtImage, WorkbenchArtPoint } from "./workbench-art";
import type { WorkbenchPose } from "./workbench-interactions";
import type { WorkbenchPart } from "./workbench-parts";

const noOffset: WorkbenchArtPoint = [0, 0];

export function partOffset(
  part: WorkbenchPart,
  pose: WorkbenchPose,
): WorkbenchArtPoint {
  switch (part) {
    case "drawer-0":
    case "drawer-1":
    case "drawer-2":
      return [-32 * pose.drawers[part], 14 * pose.drawers[part]];
    case "stool":
      return [-53 * pose.stoolSlide, 2 * pose.stoolSlide];
    case "vise-slide":
    case "vise-handle":
      return [-12 * pose.vise.opening, 4 * pose.vise.opening];
    default:
      return noOffset;
  }
}

function Sprite({
  image,
  part,
  opacity,
  brightness,
}: {
  image: WorkbenchArtImage;
  part?: WorkbenchPart;
  opacity?: number;
  brightness?: number;
}) {
  const [x, y, width, height] = image.box;
  return (
    <image
      href={assetPath(image.src)}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={opacity}
      data-workbench-part={part}
      style={
        brightness === undefined
          ? undefined
          : { filter: `brightness(${brightness})` }
      }
    />
  );
}

const circuitPaths = {
  laptop: [
    "M 775 384 L 787 376 L 803 385 L 825 393 L 808 402 Z",
    "M 775 384 L 776 391 L 809 408 L 825 400 L 825 393",
    "M 809 402 L 809 408",
    "M 800 377 Q 799 366 811 361 Q 827 364 828 376 L 828 387 Q 817 394 807 389 Z",
    "M 802 367 Q 815 367 821 380 L 821 391",
    "M 812 373 C 802 373 805 387 814 387 C 824 387 821 374 812 373 Z",
    "M 813 377 C 808 377 808 383 814 383 C 818 383 817 378 813 377 Z",
    "M 784 382 L 790 378 L 799 383 L 793 388 Z",
    "M 841 354 L 848 415",
    "M 854 363 L 868 378 L 853 377 L 862 361 L 854 363",
    "M 854 398 C 854 387 873 390 873 400 C 873 411 854 411 854 398 Z",
    "M 849 400 L 879 401 M 865 386 L 865 413",
  ],
  display: [
    "M 1004 358 L 1082 360 L 1079 386 L 1000 383 Z",
    "M 1018 351 L 1054 352 L 1050 391 L 1013 389 Z",
    "M 1000 370 L 1086 373 M 1036 347 L 1034 395",
    "M 1035 361 C 1018 360 1018 382 1034 382 C 1050 382 1051 362 1035 361 Z",
    "M 1035 364 C 1024 364 1023 379 1034 379 C 1045 379 1047 365 1035 364 Z",
    "M 1035 368 C 1028 367 1027 376 1034 376 C 1040 376 1042 368 1035 368 Z",
    "M 1008 357 L 1004 382 M 1015 357 L 1012 384 M 1054 359 L 1050 386",
    "M 1063 359 L 1058 391 M 1070 350 L 1067 396",
    "M 1007 365 L 1078 366 M 1002 379 L 1078 381",
  ],
} as const;

function ScreenAnimation({
  screen,
}: {
  screen: NonNullable<WorkbenchPose["screen"]>;
}) {
  const id = useId();
  const art = workbenchPartArt[`${screen.device}-screen`];
  const cover = art?.cover;
  const paths = circuitPaths[screen.device];
  return (
    <g
      data-blueprint-device={screen.device}
      data-progress={screen.progress}
      data-phase={
        screen.keyIndex === undefined && screen.progress > 0
          ? "drawing"
          : "typing"
      }
    >
      {cover && (
        <>
          <defs>
            <mask
              id={id}
              x="0"
              y="0"
              width="1440"
              height="900"
              maskUnits="userSpaceOnUse"
            >
              <rect width="1440" height="900" fill="white" />
              {paths
                .flatMap((path) => path.split(/ (?=M )/))
                .map((path, index, all) => {
                  const fraction = pencilEase(
                    screen.progress * all.length - index,
                  );
                  return fraction > 0 ? (
                    <path
                      key={path}
                      d={path}
                      fill="none"
                      stroke="black"
                      strokeWidth="4"
                      strokeLinecap="round"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={1 - fraction}
                    />
                  ) : null;
                })}
              <rect
                width="1440"
                height="900"
                fill="black"
                opacity={pencilEase((screen.progress - 0.87) / 0.13)}
              />
            </mask>
          </defs>
          <g mask={`url(#${id})`}>
            <Sprite image={cover} opacity={screen.clearInk} />
          </g>
        </>
      )}
      {screen.keyIndex !== undefined && (
        <KeyFeedback
          device={screen.device}
          index={screen.keyIndex}
          glow={screen.keyGlow}
          press={screen.keyPress}
        />
      )}
    </g>
  );
}

function KeyFeedback({
  device,
  index,
  glow,
  press,
}: {
  device: NonNullable<WorkbenchPose["screen"]>["device"];
  index: number;
  glow: number;
  press: number;
}) {
  const laptop = device === "laptop";
  const column = index % 9;
  const row = Math.floor(index / 9);
  const x = laptop ? 777 + column * 11 + row * 4 : 979 + column * 6 - row * 3;
  const y = laptop
    ? 425.5 - column * 0.38 + row * 2.4
    : 440.5 + column * 0.33 + row * 2.6;
  const width = laptop ? 8 : 5;
  return (
    <path
      d={`M ${x} ${y + press} l ${width} -0.4 l 2 2.4 l ${-width} 0.4 Z`}
      fill="#443b2d"
      fillOpacity={press * 0.6}
      stroke="#edbd51"
      strokeWidth="0.85"
      opacity={glow}
    />
  );
}

const woodJourney = [
  [0, 0, 0],
  [465 / 1625, -10, 26],
  [610 / 1625, -29, 11],
  [735 / 1625, -48, 56],
  [1275 / 1625, -101, 270],
  [1380 / 1625, -111, 251],
  [1460 / 1625, -115, 270],
  [1, -123, 270],
] as const;

function woodPosition(
  stock: WorkbenchPose["vise"]["stock"],
): WorkbenchArtPoint {
  if (stock.phase === "held") return noOffset;
  if (stock.phase === "grounded") return [-123, 270];
  if (stock.phase === "returning") {
    const t = stock.progress;
    return [-123 * (1 - t), 270 * (1 - t) - 230 * t * (1 - t)];
  }
  for (let index = 1; index < woodJourney.length; index++) {
    const from = woodJourney[index - 1]!;
    const to = woodJourney[index]!;
    if (stock.progress <= to[0]) {
      const t = (stock.progress - from[0]) / (to[0] - from[0]);
      return [from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    }
  }
  return [-123, 270];
}

export function WorkbenchPartLayers({ pose }: { pose: WorkbenchPose }) {
  const moved: { part: WorkbenchPart; transform: string; reveal?: number }[] =
    [];
  for (const [part, angle] of pose.swings) {
    const anchor = workbenchPartArt[part]?.anchor;
    if (anchor && angle !== 0) {
      moved.push({
        part,
        transform: `rotate(${(angle * 180) / Math.PI} ${anchor[0]} ${anchor[1]})`,
      });
    }
  }
  for (const part of [...drawerActions, "vise-slide"] as const) {
    const [x, y] = partOffset(part, pose);
    if (x !== 0 || y !== 0) {
      const reveal =
        part === "vise-slide" ? pose.vise.opening : pose.drawers[part];
      moved.push({ part, transform: `translate(${x} ${y})`, reveal });
    }
  }
  if (pose.latch > 0 && pose.lid === 0) {
    moved.push({
      part: "case-latches",
      transform: `translate(0 ${pose.latch * 3})`,
    });
  }
  if (pose.lid > 0) {
    moved.push({
      part: "case-lid",
      transform: `translate(764 495) scale(1 ${1 - pose.lid * 1.55}) translate(-764 -495)`,
      reveal: pose.lid,
    });
  }
  if (pose.vise.opening > 0 || pose.vise.handleAngle !== 0) {
    const [x, y] = partOffset("vise-handle", pose);
    const [cx, cy] = workbenchPartArt["vise-handle"]?.anchor ?? [1144, 435];
    moved.push({
      part: "vise-handle",
      transform: `translate(${x} ${y}) rotate(${(-pose.vise.handleAngle * 180) / Math.PI} ${cx} ${cy})`,
    });
  }
  const stock = pose.vise.stock;
  if (stock.phase !== "held") {
    const [x, y] = woodPosition(stock);
    const angle =
      stock.phase === "falling"
        ? stock.progress * 340
        : stock.phase === "returning"
          ? (1 - stock.progress) * 30
          : 30;
    moved.push({
      part: "vise-stock",
      transform: `translate(${x} ${y}) rotate(${angle} 1164 412)`,
    });
  }
  if (pose.stoolSlide > 0) {
    const [x, y] = partOffset("stool", pose);
    moved.push({
      part: "stool",
      transform: `translate(${x} ${y})`,
      reveal: pose.stoolSlide,
    });
  }

  const diffuser = workbenchPartArt["lamp-diffuser"]?.sprite;
  const caseArt = workbenchPartArt["case-base"];
  const openedCase = pencilEase((pose.lid - 0.38) / 0.62);
  const mouse = pose.mouse && workbenchPartArt[pose.mouse.part];
  return (
    <>
      {moved.map(({ part, reveal }) => {
        const art = workbenchPartArt[part];
        return art?.cover ? (
          <Sprite
            key={part}
            image={art.cover}
            opacity={reveal === undefined ? 1 : Math.min(1, reveal * 12)}
          />
        ) : null;
      })}
      {caseArt?.cover && openedCase > 0 && (
        <Sprite image={caseArt.cover} opacity={openedCase} />
      )}
      {moved.map(({ part, transform, reveal }) => {
        const art = workbenchPartArt[part];
        if (!art) return null;
        if (part === "case-lid") {
          return (
            <g key={part} data-workbench-part={part}>
              {art.sprite && openedCase < 1 && (
                <g transform={transform}>
                  <Sprite image={art.sprite} opacity={1 - openedCase} />
                </g>
              )}
              {caseArt?.open && (
                <Sprite image={caseArt.open} opacity={openedCase} />
              )}
            </g>
          );
        }
        return (
          <g key={part}>
            {art.open && (
              <Sprite
                image={art.open}
                opacity={pencilEase(((reveal ?? 0) - 0.26) / 0.74)}
              />
            )}
            {art.sprite && (
              <g transform={transform}>
                <Sprite image={art.sprite} part={part} />
              </g>
            )}
          </g>
        );
      })}
      {diffuser && pose.light < 1 && (
        <Sprite
          image={diffuser}
          brightness={0.58 + 0.42 * pose.light}
          part="lamp-diffuser"
        />
      )}
      {pose.screen && <ScreenAnimation screen={pose.screen} />}
      {pose.mouse && mouse?.sprite && (
        <g transform={`translate(0 ${pose.mouse.press * 0.8})`}>
          <Sprite image={mouse.sprite} part={pose.mouse.part} />
          <path
            d={mouse.outline}
            fill="none"
            stroke="#d3a142"
            strokeWidth="0.8"
            opacity={pose.mouse.glow}
          />
        </g>
      )}
    </>
  );
}
