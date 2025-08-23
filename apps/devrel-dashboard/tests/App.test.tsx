
import { test, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "../src/pages/App";

test("renders dashboard header", () => {
  const { getByText } = render(<App />);
  expect(getByText(/GNEW DevRel Dashboard/)).toBeTruthy();
});


