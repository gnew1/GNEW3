import React from "react";
import { test, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import ThreadPage from "../src/pages/threads/[id]";

vi.mock("next/router", () => ({
  useRouter: () => ({ query: { id: "1" } })
}));

vi.mock("swr", () => ({
  default: () => ({
    data: {
      title: "Test Thread",
      author: "Tester",
      posts: [
        { id: "msg-1", content: "First message", author: "Alice" },
        { id: "msg-2", content: "Second message", author: "Bob" }
      ]
    },
    error: null
  })
}));

test("thread page snapshot", () => {
  const html = renderToString(<ThreadPage />);
  expect(html).toMatchSnapshot();
});
