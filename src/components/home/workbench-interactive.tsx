import { useEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";
import { workbenchPartArt, workbenchSheet } from "./workbench-art";
import { WorkbenchDrawing } from "./workbench-drawing";
import { createWorkbenchInteractions } from "./workbench-interactions";
import { partOffset, WorkbenchPartLayers } from "./workbench-part-layers";
import { actionForPart } from "./workbench-parts";

import type { WorkbenchPose } from "./workbench-interactions";
import type { WorkbenchPart } from "./workbench-parts";
import type { PointerEvent } from "react";

type ButtonEvent = PointerEvent<HTMLButtonElement>;

const toolNames = {
  wrench: "扳手",
  pliers: "钳子",
  driver: "螺丝刀",
  hammer: "挂锤",
};

function toolLabel(part: WorkbenchPart): string {
  const [kind, index] = part.split("-");
  return `${toolNames[kind as keyof typeof toolNames]} ${Number(index) + 1}`;
}

const toolParts = Object.keys(workbenchPartArt).filter((part) =>
  /^(wrench|pliers|driver|hammer)-/.test(part),
) as WorkbenchPart[];
const leafParts = ["leaf-0", "leaf-1", "leaf-2"] as const;

const controls = [
  { part: "leaf-0", label: "盆栽叶片" },
  { part: "leaf-1", label: "左侧叶片" },
  { part: "leaf-2", label: "右侧叶片" },
  { part: "lamp", label: "工作灯" },
  ...toolParts.map((part) => ({ part, label: toolLabel(part) })),
  { part: "laptop", label: "笔记本" },
  { part: "display", label: "显示器" },
  { part: "display-key-0", label: "外接键盘" },
  { part: "mouse-left", label: "鼠标左键" },
  { part: "mouse-right", label: "鼠标右键" },
  { part: "vise-handle", label: "台钳手柄" },
  { part: "case-base", label: "工具箱" },
  { part: "stool", label: "圆凳" },
  { part: "drawer-0", label: "上抽屉" },
  { part: "drawer-1", label: "中抽屉" },
  { part: "drawer-2", label: "黄色抽屉" },
] satisfies readonly { part: WorkbenchPart; label: string }[];

function pressed(
  part: WorkbenchPart,
  pose: WorkbenchPose,
): boolean | undefined {
  switch (part) {
    case "lamp":
      return pose.lampOn;
    case "case-base":
      return pose.caseOpen;
    case "stool":
      return pose.stoolOut;
    case "drawer-0":
    case "drawer-1":
    case "drawer-2":
      return pose.activeDrawer === part;
    case "vise-handle":
      return pose.vise.opening > 0;
  }
}

type Gesture = {
  pointer: number;
  part: WorkbenchPart;
  x: number;
  y: number;
  moved: boolean;
  angle?: number;
};

export function WorkbenchInteractive({
  enabled,
  touchActive,
}: {
  enabled: boolean;
  touchActive: boolean;
}) {
  const [message, setMessage] = useState("");
  const [engine] = useState(() =>
    createWorkbenchInteractions({
      onMessage: setMessage,
      reducedMotion: () =>
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false,
      keyCount: { laptop: 27, display: 27 },
      leaves: leafParts,
    }),
  );
  const [pose, setPose] = useState(() => engine.pose);
  const layer = useRef<HTMLDivElement>(null);
  const frame = useRef<number | undefined>(undefined);
  const previousTime = useRef(0);
  const gesture = useRef<Gesture | undefined>(undefined);
  const contacts = useRef(new Set<number>());
  const lastPointerX = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function animate(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - previousTime.current) / 1000));
    previousTime.current = now;
    const moving = engine.tick(now, dt);
    setPose(engine.pose);
    frame.current = moving ? requestAnimationFrame(animate) : undefined;
  }

  function update(now: number, action: (now: number) => void) {
    action(now);
    const moving = engine.tick(now, 0);
    setPose(engine.pose);
    if (moving && frame.current === undefined) {
      previousTime.current = now;
      frame.current = requestAnimationFrame(animate);
    }
  }

  function angleAt(event: ButtonEvent) {
    const box = layer.current?.getBoundingClientRect();
    if (!box?.width) return 0;
    const [dx, dy] = partOffset("vise-handle", engine.pose);
    const [cx, cy] = workbenchPartArt["vise-handle"]?.anchor ?? [1144, 435];
    const x = ((event.clientX - box.left) * workbenchSheet.width) / box.width;
    const y =
      workbenchSheet.top +
      ((event.clientY - box.top) * workbenchSheet.sceneHeight) / box.height;
    return Math.atan2(y - cy - dy, x - cx - dx);
  }

  function cancelGesture(pointer?: number) {
    const press = gesture.current;
    if (!press || (pointer !== undefined && press.pointer !== pointer)) return;
    if (press.moved && press.angle !== undefined) engine.stopTurningVise();
    gesture.current = undefined;
  }

  function startPress(event: ButtonEvent, part: WorkbenchPart) {
    if (
      contacts.current.size !== 1 ||
      event.button !== 0 ||
      (event.pointerType === "touch" && !touchActive)
    )
      return;
    gesture.current = {
      pointer: event.pointerId,
      part,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    if (part === "vise-handle") {
      gesture.current.angle = angleAt(event);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function movePress(event: ButtonEvent) {
    const press = gesture.current;
    if (press?.pointer !== event.pointerId) return;
    const threshold = event.pointerType === "touch" ? 10 : 3;
    const moved =
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > threshold;
    if (!press.moved && !moved) return;
    if (!press.moved && press.angle !== undefined) engine.startTurningVise();
    press.moved = true;
    if (press.angle !== undefined) {
      const angle = angleAt(event);
      const delta = angle - press.angle;
      press.angle = angle;
      update(event.timeStamp, (now) =>
        engine.turnVise(-Math.atan2(Math.sin(delta), Math.cos(delta)), now),
      );
    }
  }

  function releasePress(event: ButtonEvent, part: WorkbenchPart) {
    const press = gesture.current;
    if (press?.pointer !== event.pointerId) return;
    const releasedOn = document.elementFromPoint(event.clientX, event.clientY);
    const threshold = event.pointerType === "touch" ? 10 : 3;
    if (
      !press.moved &&
      press.part === part &&
      event.currentTarget.contains(releasedOn) &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) <= threshold
    ) {
      update(event.timeStamp, (now) => engine.activate(part, now));
    }
    cancelGesture(event.pointerId);
  }

  return (
    <div
      className={styles["interactive"]}
      onPointerDownCapture={(event) => {
        contacts.current.add(event.pointerId);
        if (contacts.current.size > 1) cancelGesture();
      }}
      onPointerMoveCapture={(event) => {
        if (event.pointerType === "mouse" && event.buttons === 0)
          lastPointerX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        contacts.current.delete(event.pointerId);
        cancelGesture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        contacts.current.delete(event.pointerId);
        cancelGesture(event.pointerId);
      }}
      onLostPointerCapture={(event) => {
        contacts.current.delete(event.pointerId);
        cancelGesture(event.pointerId);
      }}
      onPointerLeave={(event) => {
        // The handle retains its captured pointer when the cursor leaves the sheet.
        if (gesture.current?.angle === undefined) {
          contacts.current.delete(event.pointerId);
          cancelGesture(event.pointerId);
        }
      }}
    >
      <WorkbenchDrawing progress={100}>
        <WorkbenchPartLayers pose={pose} />
      </WorkbenchDrawing>
      {enabled && (
        <div
          ref={layer}
          className={styles["parts"]}
          role="group"
          aria-label="二维工作台部件"
        >
          {controls.map(({ part, label }) => {
            const art = workbenchPartArt[part];
            if (!art) return null;
            const [x, y, width, height] = art.hit;
            const [dx, dy] = partOffset(part, pose);
            const lift = part === "case-base" ? pose.lid * 22 : 0;
            const angle =
              part === "vise-handle"
                ? -pose.vise.handleAngle
                : pose.swings.get(part);
            const action = actionForPart(part);
            return (
              <button
                key={part}
                type="button"
                className={
                  part === "vise-handle"
                    ? `${styles["hotspot"]} ${styles["crank"]}`
                    : styles["hotspot"]
                }
                data-workbench-control={part}
                aria-label={label}
                aria-pressed={pressed(part, pose)}
                style={{
                  left: `${((x + dx) / workbenchSheet.width) * 100}%`,
                  top: `${((y + dy - workbenchSheet.top - lift) / workbenchSheet.sceneHeight) * 100}%`,
                  width: `${(width / workbenchSheet.width) * 100}%`,
                  height: `${((height + lift) / workbenchSheet.sceneHeight) * 100}%`,
                  transform: angle ? `rotate(${angle}rad)` : undefined,
                  transformOrigin: art.anchor
                    ? `${((art.anchor[0] - x) * 100) / width}% ${((art.anchor[1] - y) * 100) / height}%`
                    : undefined,
                }}
                onPointerEnter={(event) => {
                  if (
                    event.pointerType !== "mouse" ||
                    event.buttons ||
                    (action !== "plant" && action !== "tools")
                  )
                    return;
                  const sign =
                    event.clientX < (lastPointerX.current ?? event.clientX)
                      ? -1
                      : 1;
                  update(event.timeStamp, (now) =>
                    engine.sweep(part, sign, now),
                  );
                }}
                onPointerDown={(event) => startPress(event, part)}
                onPointerMove={movePress}
                onPointerUp={(event) => releasePress(event, part)}
                onClick={(event) => {
                  // Pointer taps are confirmed on release; keyboard and assistive clicks arrive without a count.
                  if (event.detail === 0)
                    update(event.timeStamp, (now) =>
                      engine.activate(part, now),
                    );
                }}
                onKeyDown={(event) => {
                  if (
                    part !== "vise-handle" ||
                    (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                  )
                    return;
                  event.preventDefault();
                  engine.startTurningVise();
                  update(event.timeStamp, (now) =>
                    engine.turnVise(
                      event.key === "ArrowLeft" ? -Math.PI / 6 : Math.PI / 6,
                      now,
                    ),
                  );
                  engine.stopTurningVise();
                }}
              />
            );
          })}
        </div>
      )}
      <span className={styles["srOnly"]} role="status">
        {message}
      </span>
    </div>
  );
}
