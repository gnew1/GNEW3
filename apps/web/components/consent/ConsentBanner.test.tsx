import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import ConsentBanner from "./ConsentBanner";

expect.extend(toHaveNoViolations);

test("ConsentBanner a11y", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    json: async () => ({ uses: [], dataCategories: [], channels: [], matrixVersion: "v1" }),
  } as unknown as Response);
  render(<ConsentBanner subjectId="s1" />);
  const dialog = await screen.findByRole("dialog", { name: /consent banner/i });
  const results = await axe(dialog);
  expect(results).toHaveNoViolations();
});

