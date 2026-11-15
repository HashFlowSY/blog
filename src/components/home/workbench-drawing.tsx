import { useId } from "react";
import { preload } from "react-dom";

import { assetPath } from "@/lib/site";

import styles from "./assembly-workbench.module.css";
import { pencilEase, strokeFraction } from "./pencil-plan";
import { workbenchArtRoot, workbenchSheet } from "./workbench-art";
import {
  detailStrokes,
  pencilEdges,
  pointStrokes,
  shadedPlanes,
} from "./workbench-geometry";
import { WorkbenchPencil } from "./workbench-pencil";

import type { PencilStroke } from "./pencil-plan";
import type { ReactNode } from "react";

const finishedArtwork = assetPath(`${workbenchArtRoot}/workbench-rest.webp`);
const drawingPaper = assetPath(`${workbenchArtRoot}/workbench-paper.webp`);
const { width, height, top, sceneHeight } = workbenchSheet;

function RevealStroke({
  stroke,
  progress,
  width,
  clipPath,
}: {
  stroke: PencilStroke;
  progress: number;
  width: number;
  clipPath?: string;
}) {
  const fraction = strokeFraction(progress, stroke);
  return (
    <path
      d={stroke.path}
      data-pencil-path={stroke.id}
      clipPath={clipPath}
      fill="none"
      stroke="white"
      strokeWidth={width}
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
  children,
}: {
  progress: number;
  children?: ReactNode;
}) {
  const id = useId();
  const inkMask = `${id}-ink`;
  const softEdge = `${id}-edge`;
  const complete = progress >= 100;
  const finishOpacity = pencilEase((progress - 99.4) / 0.6);
  preload(finishedArtwork, { as: "image", type: "image/webp" });
  preload(drawingPaper, { as: "image", type: "image/webp" });

  return (
    <svg
      className={styles["drawing"]}
      viewBox={`0 ${top} ${width} ${sceneHeight}`}
      width={width}
      height={sceneHeight}
      aria-hidden="true"
      focusable="false"
    >
      {complete ? (
        <>
          <image
            href={finishedArtwork}
            width={width}
            height={height}
            data-workbench-art="rest"
            data-construction-layer="finish"
          />
          {children}
        </>
      ) : (
        <>
          <image href={drawingPaper} width={width} height={height} />
          <defs>
            <filter id={softEdge} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            {shadedPlanes.map((plane) => (
              <clipPath key={plane.id} id={`${id}-${plane.id}`}>
                <polygon
                  points={plane.polygon
                    .map((point) => point.join(","))
                    .join(" ")}
                />
              </clipPath>
            ))}
            {detailStrokes.map(
              ({ id: strokeId, bounds: [x, y, width, height] }) => (
                <mask
                  key={strokeId}
                  id={`${id}-${strokeId}`}
                  x={x - 16}
                  y={y - 16}
                  width={width + 32}
                  height={height + 32}
                  maskUnits="userSpaceOnUse"
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill="white"
                    filter={`url(#${softEdge})`}
                  />
                </mask>
              ),
            )}
            <mask
              id={inkMask}
              x="0"
              y="0"
              width={width}
              height={height}
              maskUnits="userSpaceOnUse"
            >
              <g
                data-construction-layer="lines"
                opacity={Number(progress > 18)}
              >
                {pencilEdges.map((stroke) => (
                  <RevealStroke
                    key={stroke.id}
                    stroke={stroke}
                    progress={progress}
                    width={8}
                  />
                ))}
              </g>
              <g
                data-construction-layer="planes"
                opacity={Number(progress > 58)}
              >
                {shadedPlanes.map((stroke) => (
                  <RevealStroke
                    key={stroke.id}
                    stroke={stroke}
                    progress={progress}
                    width={18}
                    clipPath={`url(#${id}-${stroke.id})`}
                  />
                ))}
              </g>
              <g data-construction-layer="details">
                {detailStrokes.map((stroke) => (
                  <g key={stroke.id} mask={`url(#${id}-${stroke.id})`}>
                    <RevealStroke
                      stroke={stroke}
                      progress={progress}
                      width={18}
                    />
                  </g>
                ))}
              </g>
              <rect
                width={width}
                height={height}
                fill="white"
                opacity={finishOpacity}
              />
            </mask>
          </defs>
          <image
            href={finishedArtwork}
            width={width}
            height={height}
            mask={`url(#${inkMask})`}
            data-construction-layer="finish"
            style={{ opacity: Number(progress > 18) }}
          />
          <g
            data-construction-layer="points"
            opacity={1 - pencilEase((progress - 58) / 28)}
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
          <WorkbenchPencil progress={progress} />
        </>
      )}
    </svg>
  );
}
