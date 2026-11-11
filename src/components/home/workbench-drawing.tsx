import { useId } from "react";

import styles from "./assembly-workbench.module.css";
import { constructionFraction, strokeFraction } from "./pencil-plan";
import {
  pencilEdges,
  pointStrokes,
  shadedPlanes,
  vertices,
} from "./workbench-geometry";
import { WorkbenchPencil } from "./workbench-pencil";
import { WorkbenchReveal } from "./workbench-reveal";

export function WorkbenchDrawing({ progress }: { progress: number }) {
  const drawingId = useId().replaceAll(":", "");
  const hatchId = `${drawingId}-pencil-hatch`;
  const crosshatchId = `${drawingId}-pencil-crosshatch`;
  const lineOpacity = constructionFraction((progress - 16) / 2);
  const planeOpacity = constructionFraction((progress - 57.8) / 0.2);
  const drawingOpacity = progress >= 100 ? 0 : 1;
  const pointOpacity = 1 - constructionFraction((progress - 50) / 35) * 0.7;
  return (
    <svg
      className={styles["drawing"]}
      viewBox="0 0 1536 1024"
      width="1536"
      height="1024"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={hatchId}
          width="60"
          height="36"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-34)"
        >
          <path
            d="M -8 3 Q 22 4.3 68 1.5"
            fill="none"
            stroke="#756b5c"
            strokeWidth="0.9"
            opacity="0.45"
          />
          <path
            d="M -9 15 Q 28 12.8 70 14.1"
            fill="none"
            stroke="#645b50"
            strokeWidth="0.65"
            opacity="0.34"
          />
          <path
            d="M -8 25 Q 24 28.1 69 26"
            fill="none"
            stroke="#786f60"
            strokeWidth="1.1"
            opacity="0.42"
          />
        </pattern>
        <pattern
          id={crosshatchId}
          width="54"
          height="42"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(37)"
        >
          <path
            d="M -6 4 Q 22 2.8 62 4.5 M -8 23 Q 28 25.3 62 22.4"
            fill="none"
            stroke="#645b4f"
            strokeWidth="0.8"
            opacity="0.3"
          />
        </pattern>
        {shadedPlanes.map((plane) => {
          const reveal = strokeFraction(progress, plane);
          return (
            <mask
              id={`${drawingId}-${plane.id}-shade`}
              key={plane.id}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1536"
              height="1024"
            >
              <path
                d={plane.hatch}
                fill="none"
                stroke="white"
                strokeWidth="17"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - reveal}
                opacity={reveal > 0 ? 1 : 0}
                data-pencil-path={`plane-${plane.id}`}
              />
            </mask>
          );
        })}
      </defs>

      <g
        style={{ opacity: drawingOpacity }}
        mask={progress > 82 ? `url(#${drawingId}-remaining)` : undefined}
      >
        <g opacity={planeOpacity} data-construction-layer="planes">
          {shadedPlanes.map((plane) => (
            <g key={plane.id} mask={`url(#${drawingId}-${plane.id}-shade)`}>
              <polygon
                points={plane.corners
                  .map((id) => vertices[id].join(","))
                  .join(" ")}
                fill={plane.color}
                fillOpacity={plane.id === "drawer" ? 0.48 : 0.19}
              />
              <polygon
                points={plane.corners
                  .map((id) => vertices[id].join(","))
                  .join(" ")}
                fill={`url(#${hatchId})`}
                opacity={plane.id === "rack" ? 0.52 : 0.86}
              />
              <polygon
                points={plane.corners
                  .map((id) => vertices[id].join(","))
                  .join(" ")}
                fill={`url(#${crosshatchId})`}
                opacity={
                  ["cabinetSide", "tableApron", "shelf"].includes(plane.id)
                    ? 0.9
                    : 0.22
                }
              />
            </g>
          ))}
        </g>

        <g
          fill="none"
          stroke="#554e44"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={lineOpacity}
          data-construction-layer="lines"
        >
          {pencilEdges.map((edge) => {
            const reveal = strokeFraction(progress, edge);
            return (
              <g key={edge.id}>
                {edge.strokes.map((stroke, retrace) => (
                  <path
                    key={retrace}
                    d={stroke.d}
                    strokeWidth={stroke.width * stroke.pressure}
                    opacity={stroke.opacity}
                    pathLength="1"
                    strokeDasharray="1"
                    strokeDashoffset={1 - reveal}
                    visibility={reveal > 0 ? "visible" : "hidden"}
                    data-pencil-path={retrace === 0 ? edge.id : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            );
          })}
        </g>

        <g opacity={pointOpacity} data-construction-layer="points">
          {pointStrokes.map((stroke, index) => {
            const [x, y] = stroke.point;
            const reveal = strokeFraction(progress, stroke);
            return (
              <circle
                key={stroke.id}
                cx={x}
                cy={y}
                r={5.8 * (0.6 + reveal * 0.4)}
                fill={index === 0 ? "#bca244" : "#5b5348"}
                opacity={reveal}
                visibility={reveal > 0 ? "visible" : "hidden"}
                data-pencil-point={stroke.id}
              />
            );
          })}
        </g>
      </g>
      <WorkbenchReveal progress={Math.max(82, progress)} id={drawingId} />
      <WorkbenchPencil progress={progress} />
    </svg>
  );
}
