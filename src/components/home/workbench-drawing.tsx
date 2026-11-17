import { memo, useId } from "react";

import styles from "./assembly-workbench.module.css";
import { artworkSettledAt, drawingTime, pencilEase } from "./pencil-plan";
import { workbenchDrawingArt, workbenchSheet } from "./workbench-art";
import { drawingMarks, drawingTextures } from "./workbench-geometry";
import { WorkbenchPencil } from "./workbench-pencil";

import type { DrawingMark } from "./workbench-geometry";
import type { ReactNode } from "react";

const { width, height, top, sceneHeight } = workbenchSheet;
const viewBox = `0 ${top} ${width} ${sceneHeight}`;
const textureClips = new Map(
  [
    ...new Set(drawingMarks.flatMap((mark) => (mark.clip ? [mark.clip] : []))),
  ].map((path, index) => [path, index]),
);
const tones = drawingMarks.filter((mark) => mark.kind === "tone");
const marks = drawingMarks.filter(
  (mark) => mark.kind !== "tone" && !mark.overTexture,
);
const highlights = drawingMarks.filter((mark) => mark.overTexture);

export type WorkbenchArtworkLayer = "rest" | "paper";
export type WorkbenchArtworkResult = "ready" | "failed";

function fractionAt(time: number, start: number, end: number) {
  return pencilEase((time - start) / (end - start));
}

const DrawingMarkShape = memo(function DrawingMarkShape({
  mark,
  fraction,
  opacity,
  clipPath,
}: {
  mark: DrawingMark;
  fraction: number;
  opacity: number;
  clipPath: string | undefined;
}) {
  const color = mark.color ?? "#51473a";
  const attrs = {
    "data-drawing-mark": mark.id,
    "data-mark-kind": mark.kind,
    "data-mark-stage": mark.stage,
    opacity,
    clipPath,
  };

  if (mark.kind === "point") {
    return (
      <circle
        {...attrs}
        cx={mark.point[0]}
        cy={mark.point[1]}
        r={1.3 + 1.7 * fraction}
        fill={color}
        data-pencil-point={mark.id}
        opacity={opacity * fraction}
      />
    );
  }

  if (mark.kind === "tone") {
    return (
      <path
        {...attrs}
        d={mark.path}
        fill={color}
        opacity={opacity * fraction}
      />
    );
  }

  return (
    <path
      {...attrs}
      d={mark.path}
      data-pencil-path={mark.pen !== false ? mark.id : undefined}
      fill="none"
      stroke={color}
      strokeWidth={mark.width}
      strokeLinejoin="round"
      strokeLinecap="round"
      pathLength="1"
      strokeDasharray="1 1"
      strokeDashoffset={1 - fraction}
    />
  );
});

export function WorkbenchWaitingPaper() {
  return (
    <svg
      className={styles["drawing"]}
      data-workbench-waiting=""
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M 618 436 H 630 M 624 430 V 442 M 1231 238 H 1243 M 1237 232 V 244"
        fill="none"
        stroke="#8b7960"
        strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  );
}

export function WorkbenchDrawing({
  progress,
  hidden = false,
  loadPaper = true,
  onArtworkResult,
  children,
}: {
  progress: number;
  hidden?: boolean;
  loadPaper?: boolean;
  onArtworkResult?: (
    layer: WorkbenchArtworkLayer,
    result: WorkbenchArtworkResult,
  ) => void;
  children?: ReactNode;
}) {
  const id = useId();
  const time = drawingTime(progress);
  const complete = progress >= 100;
  const settled = time >= artworkSettledAt;
  const masks = drawingTextures.filter((texture) => time > texture.fromMs);
  const matchingTexture = !settled && masks.length > 0;
  const artMask = `${id}-original`;

  function renderMark(mark: DrawingMark) {
    const fraction = fractionAt(time, mark.fromMs, mark.toMs);
    const fade = mark.fade ? 1 - fractionAt(time, ...mark.fade) : 1;
    if (fraction === 0 || fade === 0) return null;
    return (
      <DrawingMarkShape
        key={mark.id}
        mark={mark}
        fraction={fraction}
        opacity={(mark.opacity ?? 1) * fade}
        clipPath={
          mark.clip
            ? `url(#${id}-plane-${textureClips.get(mark.clip)})`
            : undefined
        }
      />
    );
  }

  return (
    <svg
      className={styles["drawing"]}
      data-workbench-drawing=""
      viewBox={viewBox}
      width={width}
      height={sceneHeight}
      aria-hidden="true"
      focusable="false"
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      {!settled && !hidden && (
        <defs>
          {Array.from(textureClips, ([path, index]) => (
            <clipPath key={index} id={`${id}-plane-${index}`}>
              <path d={path} />
            </clipPath>
          ))}
          {matchingTexture && (
            <mask
              id={artMask}
              x="0"
              y="0"
              width={width}
              height={height}
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              style={{ maskType: "alpha" }}
            >
              {masks.map((texture) => (
                <path
                  key={texture.id}
                  d={texture.path}
                  fill="white"
                  fillRule="evenodd"
                  opacity={fractionAt(time, texture.fromMs, texture.toMs)}
                />
              ))}
            </mask>
          )}
        </defs>
      )}
      {!settled && loadPaper && (
        <image
          key="paper"
          href={workbenchDrawingArt.paper}
          width={width}
          height={height}
          onLoad={() => onArtworkResult?.("paper", "ready")}
          onError={() => onArtworkResult?.("paper", "failed")}
        />
      )}
      {!settled && !hidden && (
        <g key="marks">
          {tones.map(renderMark)}
          {marks.map(renderMark)}
        </g>
      )}
      <image
        key="rest"
        href={workbenchDrawingArt.rest}
        width={width}
        height={height}
        visibility={settled || matchingTexture ? undefined : "hidden"}
        mask={matchingTexture ? `url(#${artMask})` : undefined}
        data-workbench-art={complete ? "rest" : undefined}
        onLoad={() => onArtworkResult?.("rest", "ready")}
        onError={() => onArtworkResult?.("rest", "failed")}
      />
      {!settled && !hidden && highlights.map(renderMark)}
      {complete ? children : !hidden && <WorkbenchPencil progress={progress} />}
    </svg>
  );
}
