import { jsx as _jsx } from "react/jsx-runtime";
export function Button(props) {
    return _jsx("button", { ...props, style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', ...(props.style || {}) } });
}
