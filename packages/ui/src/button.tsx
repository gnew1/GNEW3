import React from "react";

type ButtonProps = Readonly<React.ButtonHTMLAttributes<HTMLButtonElement>>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return (
    <button
      ref={ref}
      {...props}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fff",
        cursor: "pointer",
        ...(props.style || {}),
      }}
    />
  );
});
