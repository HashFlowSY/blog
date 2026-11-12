type WorkbenchPoint = readonly [number, number, number];
export type WorkbenchDevice = "laptop" | "display";
type WorkbenchMouse = "mouse-left" | "mouse-right";
export const drawerActions = ["drawer-0", "drawer-1", "drawer-2"] as const;
export const viseScrewPitch = 0.073;
export type WorkbenchDrawer = (typeof drawerActions)[number];

export type WorkbenchAction =
  | WorkbenchDevice
  | WorkbenchMouse
  | WorkbenchDrawer
  | "plant"
  | "tools"
  | "lamp"
  | "case"
  | "vise"
  | "stool";

export type WorkbenchPart =
  | WorkbenchDevice
  | WorkbenchMouse
  | WorkbenchDrawer
  | `${WorkbenchDevice}-screen`
  | `${WorkbenchDevice}-key-${number}`
  | `leaf-${number}`
  | `${"wrench" | "pliers" | "driver" | "hammer"}-${number}`
  | "lamp"
  | "lamp-diffuser"
  | "case-base"
  | "case-lid"
  | "case-latches"
  | "vise-slide"
  | "vise-handle"
  | "vise-grip"
  | "vise-stock"
  | "stool";

export interface WorkbenchKeyContact {
  center: WorkbenchPoint;
  width: number;
  depth: number;
  yaw: number;
}

export interface WorkbenchMouseContact {
  outline: readonly WorkbenchPoint[];
  axis: WorkbenchPoint;
}

export function actionForPart(
  part: WorkbenchPart,
): WorkbenchAction | undefined {
  if (part.startsWith("leaf-")) return "plant";
  if (/^(wrench|pliers|driver|hammer)-/.test(part)) return "tools";
  if (part.startsWith("case-")) return "case";
  if (part.startsWith("laptop")) return "laptop";
  if (part.startsWith("display")) return "display";
  if (part === "vise-handle" || part === "vise-grip") return "vise";
  if (part === "lamp" || part === "lamp-diffuser") return "lamp";
  if (part === "mouse-left" || part === "mouse-right" || part === "stool")
    return part;
  if (part === "drawer-0" || part === "drawer-1" || part === "drawer-2")
    return part;
}
