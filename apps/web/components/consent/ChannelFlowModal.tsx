"use client";
import React, { useEffect, useState, useRef, useId } from "react";

function ensureDialogPolyfill(dlg: HTMLDialogElement) {
  if (typeof dlg.showModal !== "function") {
    (dlg as any).showModal = () => dlg.setAttribute("open", "");
    (dlg as any).close = () => dlg.removeAttribute("open");
  }
}

function toConsentState(value: boolean): "granted" | "denied" {
  if (value) {
    return "granted";
  }
  return "denied";
}

// Flujo granular para “gestión por finalidad y canal” (email/sms/push/onchain)
type ConsentState = {
  email: { marketing: boolean };
  sms: { notifications: boolean };
  push: { notifications: boolean };
  onchain: { marketing: boolean };
};

type Props = Readonly<{ subjectId: string; open: boolean; onClose: () => void }>;

export default function ChannelFlowModal({ subjectId, open, onClose }: Props) {
export default function ChannelFlowModal({
  subjectId,
  open,
  onClose,
}: Readonly<{ subjectId:string; open:boolean; onClose:()=>void }>) {
  const [mv, setMv] = useState<string>("v1");
  const [state, setState] = useState<ConsentState>({
    email: { marketing: false },
    sms: { notifications: false },
    push: { notifications: false },
    onchain: { marketing: false },
  });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/consent/catalog")
      .then(r=>r.json())
      .then((c)=>setMv(c.matrixVersion));
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    ensureDialogPolyfill(dlg);
    if (open) {
      dlg.showModal();
    } else {
      dlg.open && dlg.close();
    }
  }, [open]);

  const save = async () => {
    const decisions:any[] = [];
    // email marketing
    decisions.push({
      purposeKey: "growth_marketing", dataCategoryKey: "email",
      processingUseKey: "marketing", channelKey: "email",
      state: toConsentState(state.email.marketing),
      policyVersion: mv, provenance: "ui_flow",
    });
    // sms/push notificaciones
    for (const channelKey of ["sms","push"] as const) {
      decisions.push({
        purposeKey: "account_access", dataCategoryKey: "phone",
        processingUseKey: "notifications", channelKey,
        state: toConsentState(state[channelKey].notifications),
        policyVersion: mv, provenance: "ui_flow",
      });
    }
    // onchain marketing (airdrop/POAPs)
    decisions.push({
      purposeKey: "growth_marketing", dataCategoryKey: "wallet_id",
      processingUseKey: "marketing", channelKey: "onchain",
      state: toConsentState(state.onchain.marketing),
      policyVersion: mv, provenance: "ui_flow",
    });

    await fetch(`/api/consent/${subjectId}/decisions`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:
      JSON.stringify({ decisions }) });
    onClose();
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">Preferencias por canal</h2>
        <Section title="Email">
          <Toggle
            label="Marketing (boletines/ofertas)"
            checked={state.email.marketing}
            onChange={(v)=>setState((s)=>({ ...s, email: { ...s.email, marketing: v } }))}
          />
        </Section>
        <Section title="SMS / Push">
          <Toggle
            label="Notificaciones de seguridad y cuenta"
            checked={state.sms.notifications}
            onChange={(v)=>setState((s)=>({ ...s, sms: { notifications: v } }))}
          />
          <Toggle
            label="Notificaciones push en app"
            checked={state.push.notifications}
            onChange={(v)=>setState((s)=>({ ...s, push: { notifications: v } }))}
          />
        </Section>
        <Section title="On‑chain">
          <Toggle
            label="Marketing (airdrops/POAPs)"
            checked={state.onchain.marketing}
            onChange={(v)=>setState((s)=>({ ...s, onchain: { marketing: v } }))}
          />
        </Section>
        <div classNamhttps://github.com/gnew1/GNEW3/pull/44/conflict?name=apps%252Fweb%252Fcomponents%252Fconsent%252FChannelFlowModal.tsx&ancestor_oid=78ca4278c02be8f6988172c004244d6b13d9eba9&base_oid=bf9894313477d36f8aa55163aabf3f0e455cacfb&head_oid=741e02586ebdd467f94d47e2edc8dd1268bda8f6e="flex justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={save}>Guardar</button>
        </div>
        <p className="text-xs text-gray-500">Tus cambios quedan auditados y puedes revocar en cualquier momento.</p>
      </div>
    </dialog>
  );
 
type SectionProps = Readonly<{ title: string; children: React.ReactNode }>;
function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

type ToggleProps = Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>;
function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />


function Section({ title, children }: Readonly<{ title:string; children:React.ReactNode }>) {
  return <div className="space-y-2"><h3 className="font-medium">{title}</h3><div className="space-y-2">{children}</div></div>;
}

function Toggle({ label, checked, onChange }: Readonly<{ label:string; checked:boolean; onChange:(v:boolean)=>void }>) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm">{label}</span>
      <input id={id} type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
    </label>
  );
}

