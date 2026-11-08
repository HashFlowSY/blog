"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";
import { drawingProgress, drawingTime } from "./pencil-plan";
import { WorkbenchDrawing } from "./workbench-drawing";
import { preloadWorkbenchScene, WorkbenchOrbit } from "./workbench-orbit";

import type { WorkbenchModelStatus } from "./workbench-orbit";

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export function AssemblyWorkbench() {
  const [progress, setProgress] = useState(0);
  const [modelStatus, setModelStatus] =
    useState<WorkbenchModelStatus>("loading");
  const [playback, setPlayback] = useState({ playing: true });
  const isPlaying = playback.playing;
  const progressRef = useRef(0);
  const complete = progress >= 100;
  const modelReady = complete && modelStatus === "ready";
  const stage =
    progress >= 82
      ? "整件"
      : progress >= 58
        ? "面"
        : progress >= 18
          ? "线"
          : "点";

  useEffect(() => {
    void preloadWorkbenchScene().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const initialTime = drawingTime(progressRef.current);
    const startedAt = performance.now();
    const reducedMotion = prefersReducedMotion();
    let frameId: number;

    function advance(time: number) {
      const next = reducedMotion
        ? 100
        : drawingProgress(initialTime + time - startedAt);
      progressRef.current = next;
      setProgress(next);
      if (next < 100) frameId = window.requestAnimationFrame(advance);
      else setPlayback({ playing: false });
    }

    frameId = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frameId);
  }, [playback, isPlaying]);

  useEffect(() => {
    function pauseWhenHidden() {
      if (document.hidden) setPlayback({ playing: false });
    }
    function restartWhenRestored(event: PageTransitionEvent) {
      if (!event.persisted) return;
      const next = prefersReducedMotion() ? 100 : 0;
      progressRef.current = next;
      setProgress(next);
      setPlayback({ playing: next < 100 });
      setModelStatus("loading");
    }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pageshow", restartWhenRestored);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("pageshow", restartWhenRestored);
    };
  }, []);

  return (
    <section className={styles["workbench"]} aria-labelledby="assembly-title">
      <div className={styles["heading"]}>
        <h2 id="assembly-title">交互工作台</h2>
        {complete ? (
          <span className={styles["viewMode"]} aria-hidden="true">
            {modelReady ? "360°" : modelStatus === "failed" ? "手绘" : "…"}
          </span>
        ) : (
          <button
            className={styles["buildButton"]}
            type="button"
            onClick={() =>
              setPlayback(({ playing }) => ({ playing: !playing }))
            }
          >
            {isPlaying ? "暂停构建" : "继续构建"}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      <div
        className={styles["scene"]}
        data-complete={complete}
        data-progress={progress}
        data-construction-stage={stage}
        data-model-ready={complete && modelReady}
      >
        <div
          className={styles["illustration"]}
          role={modelReady ? undefined : "img"}
          aria-hidden={modelReady || undefined}
          aria-label={
            modelReady
              ? undefined
              : complete
                ? "手绘工作台"
                : `工作台构建：${stage}阶段`
          }
        >
          <WorkbenchDrawing progress={progress} />
        </div>
        {progress >= 82 && (
          <WorkbenchOrbit active={complete} onStatus={setModelStatus} />
        )}
      </div>
      <span className={styles["srOnly"]} role="status">
        {complete
          ? modelReady
            ? "工作台绘制完成，可以360度旋转查看"
            : modelStatus === "failed"
              ? "已保留手绘工作台，当前设备无法启用三维视图"
              : "手绘完成，正在准备三维工作台"
          : isPlaying
            ? "正在绘制工作台"
            : "绘制已暂停"}
      </span>
    </section>
  );
}
