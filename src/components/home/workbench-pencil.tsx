import { useLayoutEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";
import { pencilPosition, pencilWear } from "./pencil-route";
import { workbenchDrawingArt } from "./workbench-art";

import type { PencilPoint } from "./pencil-plan";

const spriteWidth = 250;
const spriteHeight = 83.333;
const tipX = 13.006;
const tipY = 42.012;
const tailStart = 226;
const leadWear = 1.8;
const initialShaftTrim = 75;
const finalShaftTrim = 128;

export function WorkbenchPencil({ progress }: { progress: number }) {
  const [artFailed, setArtFailed] = useState(false);
  const cursor = useRef<SVGGElement>(null);
  const barrel = useRef<SVGGElement>(null);
  const contact = useRef<SVGEllipseElement>(null);
  const paths = useRef(
    new Map<string, { path: SVGPathElement; length: number }>(),
  );
  const wear = pencilWear(progress);
  const tip = tipX + leadWear * wear;
  const shaftTrim =
    initialShaftTrim + (finalShaftTrim - initialShaftTrim) * wear;
  const shaftLength = tailStart - tip - shaftTrim;
  const shaftClipWidth = shaftLength + 1;
  const tailWidth = spriteWidth - tailStart;

  useLayoutEffect(() => {
    const element = cursor.current;
    if (!element) return;
    function sample(
      stroke: { id: string; path: string },
      fraction: number,
    ): PencilPoint {
      let metric = paths.current.get(stroke.id);
      if (!metric) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("d", stroke.path);
        metric = { path, length: path.getTotalLength() };
        paths.current.set(stroke.id, metric);
      }
      const point = metric.path.getPointAtLength(metric.length * fraction);
      return [point.x, point.y];
    }
    const pose = pencilPosition(progress, sample);
    element.setAttribute("opacity", pose ? String(pose.opacity) : "0");
    element.setAttribute("visibility", pose ? "visible" : "hidden");
    if (!pose) return;
    element.setAttribute("transform", `translate(${pose.x} ${pose.y})`);
    element.setAttribute("data-stroke", pose.stroke);
    element.setAttribute("data-phase", pose.phase);
    element.setAttribute("data-fraction", String(pose.fraction));
    element.setAttribute("data-pencil-medium", pose.medium);
    barrel.current?.setAttribute("transform", `rotate(${pose.angle})`);
    contact.current?.setAttribute("opacity", String((1 - pose.lift) * 0.16));
  }, [progress]);

  if (artFailed) return null;

  const sprite = (
    <image
      className={styles["pencilImage"]}
      href={workbenchDrawingArt.pencil}
      width={spriteWidth}
      height={spriteHeight}
      onError={() => setArtFailed(true)}
    />
  );

  return (
    <g
      ref={cursor}
      className={styles["pencil"]}
      data-construction-layer="pencil"
      data-pencil-wear={wear}
      aria-hidden="true"
      visibility="hidden"
      opacity="0"
    >
      <ellipse ref={contact} cx="0" cy="2" rx="8" ry="2.5" fill="#514a3d" />
      <g ref={barrel}>
        {/* Slide the original tail over the shortened shaft. The extra unit
            under the join covers subpixel gaps when the artwork is scaled. */}
        <svg
          y={-tipY}
          width={shaftClipWidth}
          height={spriteHeight}
          viewBox={`${tip} 0 ${shaftClipWidth} ${spriteHeight}`}
          style={{ overflow: "hidden" }}
          data-pencil-body="true"
        >
          {sprite}
          <path
            className={styles["yellowTip"]}
            d={`M ${tip} ${tipY} L 22 40.45 L 22 43.55 Z`}
            fill="#bb8a17"
          />
        </svg>
        <svg
          x={shaftLength}
          y={-tipY}
          width={tailWidth}
          height={spriteHeight}
          viewBox={`${tailStart} 0 ${tailWidth} ${spriteHeight}`}
          style={{ overflow: "hidden" }}
        >
          {sprite}
        </svg>
      </g>
    </g>
  );
}
