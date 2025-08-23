export function KpiCard({ label, value, suffix="", loading=false }: {label:string; value:any; suffix?:string; loading?:boolean}) {
  return (
    <div className="card">
      <div className="badge">{label}</div>
      <div style={{fontSize:24, fontWeight:700, marginTop:8}}>
        {loading ? <span className="skeleton" style={{display:"inline-block",height:28,width:120}}/> : <>{value}{suffix}</>}
      </div>
    </div>
  );
}

