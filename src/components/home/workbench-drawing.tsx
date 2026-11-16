import { useId } from "react";

import styles from "./assembly-workbench.module.css";
import { pencilEase, positioningEnd, strokeFraction } from "./pencil-plan";
import { workbenchDrawingArt, workbenchSheet } from "./workbench-art";
import { drawingAreas, pointStrokes } from "./workbench-geometry";
import { WorkbenchPencil } from "./workbench-pencil";

import type { PencilStroke } from "./pencil-plan";
import type { ReactNode } from "react";

const { width, height, top, sceneHeight } = workbenchSheet;

export type WorkbenchArtworkLayer = "rest" | "paper";
export type WorkbenchArtworkResult = "ready" | "failed";

function RevealStroke({
  stroke,
  progress,
}: {
  stroke: PencilStroke & { width: number };
  progress: number;
}) {
  const fraction = strokeFraction(progress, stroke);
  return (
    <path
      d={stroke.path}
      data-pencil-path={stroke.id}
      fill="none"
      stroke="black"
      strokeWidth={stroke.width}
      strokeLinejoin="round"
      strokeLinecap="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - fraction}
      visibility={fraction ? "visible" : "hidden"}
    />
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
  const paperMask = `${id}-paper`;
  const complete = progress >= 100;
  const unfinished = drawingAreas.filter((area) => progress < area.end);
  // Draw shared edges within a single fill so no paper seam can show through.
  const paperPath = unfinished.map(({ points }) => `M${points}Z`).join("");

  return (
    <svg
      className={styles["drawing"]}
      viewBox={`0 ${top} ${width} ${sceneHeight}`}
      width={width}
      height={sceneHeight}
      aria-hidden="true"
      focusable="false"
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      <image
        href={workbenchDrawingArt.rest}
        width={width}
        height={height}
        data-workbench-art={complete ? "rest" : undefined}
        onLoad={() => onArtworkResult?.("rest", "ready")}
        onError={() => onArtworkResult?.("rest", "failed")}
      />
      {complete ? (
        children
      ) : (
        <>
          <defs>
            {unfinished.map(({ id: area, points }) => (
              <clipPath key={area} id={`${id}-${area}`}>
                <polygon points={points} />
              </clipPath>
            ))}
            <mask
              id={paperMask}
              x="0"
              y="0"
              width={width}
              height={height}
              maskUnits="userSpaceOnUse"
            >
              <path d={paperPath} fill="white" />
              {unfinished.map(({ id: area, strokes }) => (
                <g
                  key={area}
                  clipPath={`url(#${id}-${area})`}
                  data-drawing-area={area}
                >
                  {strokes.map((stroke) => (
                    <RevealStroke
                      key={stroke.id}
                      stroke={stroke}
                      progress={progress}
                    />
                  ))}
                </g>
              ))}
            </mask>
          </defs>
          {loadPaper && (
            <g mask={`url(#${paperMask})`}>
              <image
                href={workbenchDrawingArt.paper}
                width={width}
                height={height}
                onLoad={() => onArtworkResult?.("paper", "ready")}
                onError={() => onArtworkResult?.("paper", "failed")}
              />
            </g>
          )}
          <g
            data-construction-layer="points"
            opacity={1 - pencilEase((progress - positioningEnd) / 6)}
          >
            {pointStrokes.map((stroke, index) => {
              const fraction = strokeFraction(progress, stroke);
              return (
                <circle
                  key={stroke.id}
                  cx={stroke.point[0]}
                  cy={stroke.point[1]}
                  r={1.4 + fraction * 1.8}
                  fill={index === 0 ? "#ac913a" : "#595044"}
                  opacity={fraction}
                  visibility={fraction ? "visible" : "hidden"}
                  data-pencil-point={stroke.id}
                />
              );
            })}
          </g>
          {!hidden && <WorkbenchPencil progress={progress} />}
        </>
      )}
    </svg>
  );
}
