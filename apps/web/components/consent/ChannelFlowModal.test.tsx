import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import ChannelFlowModal from "./ChannelFlowModal";

expect.extend(toHaveNoViolations);

test("ChannelFlowModal a11y", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    json: async () => ({ matrixVersion: "v1" }),
  } as unknown as Response);
  render(<ChannelFlowModal subjectId="s1" open onClose={() => {}} />);
  const dialog = await screen.findByRole("dialog");
  const results = await axe(dialog);
  expect(results).toHaveNoViolations();
});

