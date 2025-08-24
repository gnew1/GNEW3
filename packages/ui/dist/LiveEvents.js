import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useRealtime } from './hooks/useRealtime';
import { Button } from './button';
import { Card } from './card';
export function LiveEvents({ token }) {
    const [room, setRoom] = React.useState('governance');
    const { connected, presence, events } = useRealtime({ token, room
    });
    return (_jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(Button, { onClick: () => setRoom('governance'), "aria-pressed": room === 'governance', children: "Gobernanza" }), _jsx(Button, { onClick: () => setRoom('economy'), "aria-pressed": room
                            === 'economy', children: "Econom\u00EDa" }), _jsxs("span", { style: { marginLeft: 'auto' }, children: ["Estado: ", connected ?
                                'Conectado' : 'Offline', " \u2022 Presentes: ", presence.length] })] }), _jsxs(Card, { title: `Eventos en ${room}`, children: [_jsxs("ul", { style: { listStyle: 'none', padding: 0, margin: 0,
                            display: 'grid', gap: 6 }, children: [events.map((e, i) => (_jsx("li", { style: ({ fontFamily: 'ui-monospace, ,
                                    SFMono } - Regular, Menlo, monospace) }, i)), ' }}> 
                                < strong > { new: Date(e.ts).toLocaleTimeString() }), ":"] }), _jsx("code", { children: JSON.stringify(e.data) })] }), "))}", events.length === 0 && _jsx("li", { children: "No hay eventos a\u00FAn\u2026" })] }));
    Card >
    ;
    div >
    ;
    ;
}
