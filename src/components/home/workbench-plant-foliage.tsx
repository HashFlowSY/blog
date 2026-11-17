import { useId } from "react";

import { workbenchPlantArt, workbenchPlantTwigs } from "./workbench-art";

import type { WorkbenchLeaf } from "./workbench-parts";
import type { ReactNode } from "react";

export function WorkbenchPlantFoliage({
  swings,
  artwork,
}: {
  swings: ReadonlyMap<WorkbenchLeaf, number>;
  artwork: ReactNode;
}) {
  const id = useId();
  const [x, y, width, height] = workbenchPlantArt.foliage.box;
  const branches = [...swings].map(([part, angle]) => ({
    part,
    angle,
    ...workbenchPlantTwigs[part],
  }));
  if (!branches.length) return null;

  return (
    <g data-workbench-plant="foliage">
      <defs>
        <mask
          id={`${id}-fixed`}
          x={x}
          y={y}
          width={width}
          height={height}
          maskUnits="userSpaceOnUse"
        >
          <rect x={x} y={y} width={width} height={height} fill="white" />
          {branches.map(({ part, outline }) => (
            <path key={part} d={outline} fill="black" />
          ))}
          {/* Keep a short section of the original stem over each hinge. */}
          {branches.map(({ part, pivot: [cx, cy] }) => (
            <circle key={part} cx={cx} cy={cy} r={2} fill="white" />
          ))}
        </mask>
        {branches.map(({ part, outline }) => (
          <clipPath key={part} id={`${id}-${part}`}>
            <path d={outline} />
          </clipPath>
        ))}
      </defs>
      {branches.map(({ part, angle, pivot: [cx, cy] }) => (
        <g
          key={part}
          data-workbench-leaf={part}
          transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`}
        >
          <g clipPath={`url(#${id}-${part})`}>{artwork}</g>
        </g>
      ))}
      <g mask={`url(#${id}-fixed)`}>{artwork}</g>
    </g>
  );
}
