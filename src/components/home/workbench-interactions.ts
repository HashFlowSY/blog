import { isWorkbenchLeaf, workbenchLeaves } from "./workbench-parts";

import type {
  WorkbenchDevice,
  WorkbenchLeaf,
  WorkbenchPart,
} from "./workbench-parts";

const keyInterval = 205;
const keyPulse = 199;
const drawingDuration = 2750;
const lampFadeSeconds = {
  on: { source: 0.1, surface: 0.22 },
  off: { source: 0.08, surface: 0.17 },
};

export interface WorkbenchPose {
  lampOn: boolean;
  light: number;
  sourceLight: number;
  swings: ReadonlyMap<WorkbenchLeaf, number>;
  screen:
    | {
        device: WorkbenchDevice;
        clearInk: number;
        progress: number;
        keyIndex: number | undefined;
        keyPress: number;
        keyGlow: number;
      }
    | undefined;
}

interface WorkbenchInteractionOptions {
  reducedMotion?: () => boolean;
  onMessage?: (message: string) => void;
  random?: () => number;
}

function unit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number, start: number, end: number) {
  const t = unit((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function createWorkbenchInteractions({
  reducedMotion = () => false,
  onMessage = () => {},
  random = Math.random,
}: WorkbenchInteractionOptions = {}) {
  const springs = new Map<
    WorkbenchLeaf,
    { angle: number; speed: number; entered: number }
  >();
  let lampOn = true;
  let light = 1;
  let sourceLight = 1;
  let screen: WorkbenchPose["screen"];
  let typing:
    | { device: WorkbenchDevice; start: number; sequence: number[] }
    | undefined;
  let selected: WorkbenchDevice | undefined;
  let message = "";

  function publish(next: string) {
    if (next === message) return;
    message = next;
    onMessage(next);
  }

  function swing(part: WorkbenchLeaf, sign: number, now: number, strength = 1) {
    const spring = springs.get(part) ?? {
      angle: 0,
      speed: 0,
      entered: -Infinity,
    };
    if (now - spring.entered < 280) return;
    spring.speed = Math.min(
      2.05,
      Math.max(-2.05, spring.speed + sign * strength * 1.7),
    );
    spring.entered = now;
    springs.set(part, spring);
  }

  function sweep(part: WorkbenchLeaf, sign: number, now: number) {
    if (reducedMotion()) return;
    swing(part, sign, now);
    const next = (workbenchLeaves.indexOf(part) + 1) % workbenchLeaves.length;
    swing(workbenchLeaves[next]!, -sign, now, 0.35);
  }

  function startTyping(device: WorkbenchDevice, now: number) {
    if (reducedMotion()) {
      publish("图纸已就绪");
      return;
    }
    const available = Array.from({ length: 27 }, (_, i) => i);
    const sequence = Array.from({ length: 9 }, () => {
      const index = Math.floor(random() * available.length);
      return available.splice(index, 1)[0]!;
    });
    typing = { device, start: now, sequence };
    publish(`${device === "laptop" ? "笔记本" : "外接键盘"}正在打字`);
  }

  function activate(part: WorkbenchPart, now: number) {
    if (part === "lamp") {
      selected = undefined;
      lampOn = !lampOn;
      publish(lampOn ? "工作灯已开启" : "工作灯已关闭");
      return;
    }

    if (isWorkbenchLeaf(part)) {
      selected = undefined;
      sweep(part, 1, now);
      publish(reducedMotion() ? "树叶保持静止" : "树叶轻摆");
      return;
    }

    if (typing) return;
    const device = part === "display-key-0" ? "display" : part;
    selected = device;
    startTyping(device, now);
  }

  function tickTyping(now: number, instant: boolean) {
    if (!typing) return false;
    const { device, sequence, start } = typing;
    const elapsed = Math.max(0, now - start);
    const lastKey = Math.max(0, (sequence.length - 1) * keyInterval + keyPulse);
    if (instant || elapsed >= lastKey + drawingDuration) {
      screen = undefined;
      typing = undefined;
      if (selected === device) publish("图纸绘制完成");
      return false;
    }
    if (elapsed < lastKey) {
      const index = Math.floor(elapsed / keyInterval);
      const age = elapsed - index * keyInterval;
      screen = {
        device,
        clearInk: smoothstep(elapsed, 65, 390),
        progress: 0,
        keyIndex: sequence[index],
        keyPress: smoothstep(age, 0, 36) * (1 - smoothstep(age, 144, 193)),
        keyGlow: smoothstep(age, 0, 24) * (1 - smoothstep(age, 152, keyPulse)),
      };
    } else {
      if (selected === device) publish("正在逐笔绘图");
      screen = {
        device,
        clearInk: 1,
        progress: unit((elapsed - lastKey) / drawingDuration),
        keyIndex: undefined,
        keyPress: 0,
        keyGlow: 0,
      };
    }
    return true;
  }

  function tickSwings(dt: number, instant: boolean) {
    if (instant) {
      springs.clear();
      return;
    }
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const step = dt / steps;
    for (const [part, spring] of springs) {
      for (let i = 0; i < steps; i++) {
        spring.speed -= (spring.angle * 100 + spring.speed * 8.9) * step;
        spring.angle = Math.min(
          0.125,
          Math.max(-0.125, spring.angle + spring.speed * step),
        );
      }
      if (Math.abs(spring.angle) < 0.001 && Math.abs(spring.speed) < 0.018)
        springs.delete(part);
    }
  }

  function tickLamp(dt: number, instant: boolean) {
    const target = Number(lampOn);
    if (instant) {
      light = target;
      sourceLight = target;
    } else {
      const duration = lampOn ? lampFadeSeconds.on : lampFadeSeconds.off;
      const step = lampOn ? dt : -dt;
      light = unit(light + step / duration.surface);
      sourceLight = unit(sourceLight + step / duration.source);
    }
    return light !== target || sourceLight !== target;
  }

  function tick(now: number, dt: number) {
    const instant = reducedMotion();
    const lampMoving = tickLamp(dt, instant);
    tickSwings(dt, instant);
    const typingMoving = tickTyping(now, instant);
    return lampMoving || typingMoving || springs.size > 0;
  }

  return {
    activate,
    sweep,
    tick,
    get pose(): WorkbenchPose {
      const swings = new Map<WorkbenchLeaf, number>();
      for (const [part, spring] of springs) {
        if (spring.angle !== 0) swings.set(part, spring.angle);
      }
      return {
        lampOn,
        light,
        sourceLight,
        screen,
        swings,
      };
    },
  };
}
