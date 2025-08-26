
import { test, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("swr", () => ({
  __esModule: true,
  default: () => ({ data: [], error: undefined })
}));

import App from "../src/pages/App";

test("renders dashboard header", () => {
  const html = renderToString(<App />);
  expect(html).toContain("GNEW DevRel Dashboard");
});


