import { useEffect, useId, useRef, useState } from "react";

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

export type WorkbenchModelStatus = "loading" | "ready" | "failed";

export function WorkbenchOrbit({
  onStatus,
  active = true,
}: {
  onStatus?: (status: WorkbenchModelStatus) => void;
  active?: boolean;
}) {
  const instructionsId = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorkbenchScene | undefined>(undefined);
  const [status, setStatus] = useState<WorkbenchModelStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    let viewer: WorkbenchScene | undefined;
    async function initialize() {
      try {
        const sceneFactory = await preloadWorkbenchScene();
        if (cancelled || !canvas.current) return;
        viewer = await sceneFactory.createWorkbenchScene(canvas.current);
        if (cancelled) {
          viewer.dispose();
          return;
        }
        engine.current = viewer;
        setStatus("ready");
        onStatus?.("ready");
      } catch {
        if (cancelled) return;
        setStatus("failed");
        onStatus?.("failed");
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      engine.current = undefined;
      viewer?.dispose();
    };
  }, [onStatus]);

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
        engine.current.zoom(1.15);
        break;
      case "-":
        engine.current.zoom(1 / 1.15);
        break;
      case "Home":
        engine.current.reset();
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
      aria-hidden={!active || status !== "ready"}
      aria-busy={status === "loading"}
      data-model-status={status}
      data-active={active}
      tabIndex={active && status === "ready" ? 0 : -1}
      onKeyDown={handleKey}
      onDoubleClick={() => engine.current?.reset()}
      onPointerDown={(event) =>
        event.currentTarget.focus({ preventScroll: true })
      }
    >
      <canvas
        ref={canvas}
        className={styles["modelCanvas"]}
        aria-hidden="true"
        tabIndex={-1}
      />
      <span id={instructionsId} className={styles["srOnly"]}>
        拖动可360度旋转，滚轮或双指缩放；方向键调整角度，Home键或双击复位。
      </span>
      {status === "failed" && (
        <span className={styles["srOnly"]} role="status">
          当前设备无法启用立体视图，已保留手绘工作台。
        </span>
      )}
    </div>
  );
}
