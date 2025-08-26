import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { expect, test } from "vitest";
import "@testing-library/jest-dom/vitest";

import AISuggestions from "./AISuggestions";

expect.extend(toHaveNoViolations);

test("AISuggestions a11y", async () => {
  const { container } = render(<AISuggestions messages={[{ id: "1", text: "hola" }]} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

