import { useEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";
import { workbenchPartArt, workbenchSheet } from "./workbench-art";
import { WorkbenchDrawing } from "./workbench-drawing";
import { createWorkbenchInteractions } from "./workbench-interactions";
import { WorkbenchPartLayers } from "./workbench-part-layers";
import { isWorkbenchLeaf } from "./workbench-parts";

import type { WorkbenchPart } from "./workbench-parts";
import type { PointerEvent } from "react";

type ButtonEvent = PointerEvent<HTMLButtonElement>;

const controls = [
  { part: "leaf-0", label: "盆栽叶片" },
  { part: "leaf-1", label: "左侧叶片" },
  { part: "leaf-2", label: "右侧叶片" },
  { part: "lamp", label: "工作灯" },
  { part: "laptop", label: "笔记本" },
  { part: "display", label: "显示器" },
  { part: "display-key-0", label: "外接键盘" },
] satisfies readonly { part: WorkbenchPart; label: string }[];

type Tap = {
  pointer: number;
  part: WorkbenchPart;
  x: number;
  y: number;
  moved: boolean;
};

function exceedsTapDistance(event: PointerEvent, tap: Tap) {
  const threshold = event.pointerType === "touch" ? 10 : 3;
  return Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > threshold;
}

export function WorkbenchInteractive({ enabled }: { enabled: boolean }) {
  const [message, setMessage] = useState("");
  const [engine] = useState(() =>
    createWorkbenchInteractions({
      onMessage: setMessage,
      reducedMotion: () =>
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false,
    }),
  );
  const [pose, setPose] = useState(() => engine.pose);
  const frame = useRef<number | undefined>(undefined);
  const previousTime = useRef(0);
  const tap = useRef<Tap | undefined>(undefined);
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

  function update(now: number, action: () => void) {
    action();
    const moving = engine.tick(now, 0);
    setPose(engine.pose);
    if (moving && frame.current === undefined) {
      previousTime.current = now;
      frame.current = requestAnimationFrame(animate);
    }
  }

  function endContact(event: PointerEvent<HTMLDivElement>) {
    contacts.current.delete(event.pointerId);
    if (tap.current?.pointer === event.pointerId) tap.current = undefined;
  }

  function startTap(event: ButtonEvent, part: WorkbenchPart) {
    if (contacts.current.size !== 1 || event.button !== 0) return;
    tap.current = {
      pointer: event.pointerId,
      part,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.buttons === 0)
      lastPointerX.current = event.clientX;

    const active = tap.current;
    if (
      active?.pointer === event.pointerId &&
      exceedsTapDistance(event, active)
    )
      active.moved = true;
  }

  function confirmTap(event: ButtonEvent, part: WorkbenchPart) {
    const active = tap.current;
    if (
      active?.pointer !== event.pointerId ||
      active.part !== part ||
      active.moved ||
      exceedsTapDistance(event, active)
    ) {
      return;
    }

    const releasedOn = document.elementFromPoint(event.clientX, event.clientY);
    if (event.currentTarget.contains(releasedOn))
      update(event.timeStamp, () => engine.activate(part, event.timeStamp));
  }

  return (
    <div
      className={styles["interactive"]}
      onPointerDownCapture={(event) => {
        contacts.current.add(event.pointerId);
        if (contacts.current.size > 1) tap.current = undefined;
      }}
      onPointerMoveCapture={movePointer}
      onPointerUp={endContact}
      onPointerCancel={endContact}
      onLostPointerCapture={endContact}
      onPointerLeave={endContact}
    >
      <WorkbenchDrawing progress={100}>
        <WorkbenchPartLayers pose={pose} />
      </WorkbenchDrawing>
      {enabled && (
        <div
          className={styles["parts"]}
          role="group"
          aria-label="二维工作台部件"
        >
          {controls.map(({ part, label }) => {
            const {
              hit: [x, y, width, height],
              anchor,
            } = workbenchPartArt[part];
            const angle = isWorkbenchLeaf(part)
              ? pose.swings.get(part)
              : undefined;
            return (
              <button
                key={part}
                type="button"
                className={styles["hotspot"]}
                aria-label={label}
                aria-pressed={part === "lamp" ? pose.lampOn : undefined}
                style={{
                  left: `${(x / workbenchSheet.width) * 100}%`,
                  top: `${((y - workbenchSheet.top) / workbenchSheet.sceneHeight) * 100}%`,
                  width: `${(width / workbenchSheet.width) * 100}%`,
                  height: `${(height / workbenchSheet.sceneHeight) * 100}%`,
                  transform: angle ? `rotate(${angle}rad)` : undefined,
                  transformOrigin: anchor
                    ? `${((anchor[0] - x) * 100) / width}% ${((anchor[1] - y) * 100) / height}%`
                    : undefined,
                }}
                onPointerEnter={(event) => {
                  if (
                    !isWorkbenchLeaf(part) ||
                    event.pointerType !== "mouse" ||
                    event.buttons
                  )
                    return;
                  const sign =
                    event.clientX < (lastPointerX.current ?? event.clientX)
                      ? -1
                      : 1;
                  update(event.timeStamp, () =>
                    engine.sweep(part, sign, event.timeStamp),
                  );
                }}
                onPointerDown={(event) => startTap(event, part)}
                onPointerUp={(event) => confirmTap(event, part)}
                onClick={(event) => {
                  // Pointer taps are confirmed on release. Keyboard and assistive clicks have no click count.
                  if (event.detail === 0)
                    update(event.timeStamp, () =>
                      engine.activate(part, event.timeStamp),
                    );
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
