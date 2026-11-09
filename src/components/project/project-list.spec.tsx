import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ProjectList } from "./project-list";

describe("ProjectList", () => {
  it("renders an empty state when projects is empty", () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText("暂无项目")).toBeInTheDocument();
  });
});
