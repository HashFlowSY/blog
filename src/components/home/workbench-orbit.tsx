import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";

import type { WorkbenchScene } from "./workbench-scene";
import type * as WorkbenchSceneModule from "./workbench-scene";
import type { KeyboardEvent } from "react";

let sceneModule: Promise<typeof WorkbenchSceneModule> | undefined;

export function preloadWorkbenchScene() {
  sceneModule ??= import("./workbench-scene").catch((error: unknown) => {
    sceneModule = undefined;
    throw error;
  });
  return sceneModule;
}

const workbenchZoomStep = 1.15;

export type WorkbenchModelStatus = "loading" | "ready" | "failed";

export function WorkbenchOrbit({
  onStatus,
  touchActive,
}: {
  onStatus: (status: WorkbenchModelStatus) => void;
  touchActive: boolean;
}) {
  const instructionsId = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorkbenchScene | undefined>(undefined);
  const [status, setStatus] = useState<WorkbenchModelStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let viewer: WorkbenchScene | undefined;
    async function initialize() {
      try {
        const sceneFactory = await preloadWorkbenchScene();
        if (cancelled || !canvas.current) return;
        viewer = await sceneFactory.createWorkbenchScene(
          canvas.current,
          (message) => {
            if (!cancelled) setMessage(message);
          },
        );
        if (cancelled) {
          viewer.dispose();
          return;
        }
        engine.current = viewer;
        setStatus("ready");
        onStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("failed");
        onStatus("failed");
      }
    }
    // Let the completed illustration reach the screen before compiling WebGL.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => void initialize());
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      engine.current = undefined;
      viewer?.dispose();
    };
  }, [onStatus]);

  useLayoutEffect(() => {
    engine.current?.setTouchInteraction(touchActive);
  }, [status, touchActive]);

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || !engine.current)
      return;
    switch (event.key) {
      case "ArrowLeft":
        engine.current.rotate(-15, 0);
        break;
      case "ArrowRight":
        engine.current.rotate(15, 0);
        break;
      case "ArrowUp":
        engine.current.rotate(0, 10);
        break;
      case "ArrowDown":
        engine.current.rotate(0, -10);
        break;
      case "+":
      case "=":
        engine.current.zoom(workbenchZoomStep);
        break;
      case "-":
        engine.current.zoom(1 / workbenchZoomStep);
        break;
      case "Home":
        engine.current.reset();
        break;
      case "Enter":
      case " ":
        if (!event.repeat) engine.current.toggleYellowDrawer();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      className={styles["orbit"]}
      role="group"
      aria-label="可旋转的立体工作台"
      aria-roledescription="三维模型"
      aria-describedby={instructionsId}
      aria-hidden={status !== "ready"}
      aria-busy={status === "loading"}
      data-model-status={status}
      tabIndex={status === "ready" ? 0 : -1}
      onKeyDown={handleKey}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch")
          event.currentTarget.focus({ preventScroll: true });
      }}
    >
      <canvas
        ref={canvas}
        className={styles["modelCanvas"]}
        aria-hidden="true"
        onDoubleClick={(event) =>
          engine.current?.resetAt(event.clientX, event.clientY)
        }
      />
      <span id={instructionsId} className={styles["srOnly"]}>
        拖动可 360
        度旋转。触屏先开启操作，再用双指缩放。方向键旋转，加号和减号缩放，按
        Home 键或双击空白处复位视角。按 Enter 或空格开合黄色抽屉。
      </span>
      <span className={styles["srOnly"]} role="status">
        {message}
      </span>
    </div>
  );
}
