import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Card({ title, children }) {
    return (_jsxs("div", { style: { border: '1px solid #eee', borderRadius: 12, background: '#fff' }, children: [title && _jsx("div", { style: { padding: '10px 14px', borderBottom: '1px solid #eee', fontWeight: 600 }, children: title }), _jsx("div", { style: { padding: '10px 14px' }, children: children })] }));
}
