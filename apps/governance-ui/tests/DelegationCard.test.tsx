import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { describe, expect, it } from "vitest";
import React from "react";
import DelegationCard from "../src/components/DelegationCard";

expect.extend(toHaveNoViolations);

describe("DelegationCard", () => {
  it("links labels to inputs", () => {
    render(<DelegationCard contractAddress="0x0" />);
    expect(screen.getByLabelText("Delegado")).toBeInTheDocument();
    expect(screen.getByLabelText("Expiración (opcional)")).toBeInTheDocument();
  });

  it("is accessible", async () => {
    const { container } = render(<DelegationCard contractAddress="0x0" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

