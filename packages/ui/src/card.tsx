import React from "react";

type CardProps = Readonly<{
  title?: string;
  children?: React.ReactNode;
}>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { title, children },
  ref
) {
  return (
    <div ref={ref} style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
      {title && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #eee", fontWeight: 600 }}>
          {title}
        </div>
      )}
      <div style={{ padding: "10px 14px" }}>{children}</div>
    </div>
  );
});
