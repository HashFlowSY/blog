export const workbenchLeaves = ["leaf-0", "leaf-1", "leaf-2"] as const;

export type WorkbenchDevice = "laptop" | "display";
export type WorkbenchLeaf = (typeof workbenchLeaves)[number];
export type WorkbenchPart =
  | WorkbenchDevice
  | WorkbenchLeaf
  | "display-key-0"
  | "lamp";

export function isWorkbenchLeaf(part: WorkbenchPart): part is WorkbenchLeaf {
  return part.startsWith("leaf-");
}
