import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const Button = React.forwardRef(function Button(props, ref) {
  return _jsx("button", {
    ref: ref,
    ...props,
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
      ...(props.style || {}),
    },
  });
});
