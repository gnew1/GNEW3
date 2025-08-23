type Props = {
  chain: string; network: string; token: string; range: string;
  onChange: (p: {chain:string; network:string; token:string; range:string}) => void;
};
export function Filters({ chain, network, token, range, onChange }: Props) {
  return (
    <>
      <div>
        <label>Chain</label><br/>
        <select value={chain} onChange={e => onChange({ chain: e.target.value, network, token, range })}>
          <option value="eth">Ethereum</option>
          <option value="polygon">Polygon</option>
          <option value="bsc">BSC</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
        </select>
      </div>
      <div>
        <label>Network</label><br/>
        <select value={network} onChange={e => onChange({ chain, network: e.target.value, token, range })}>
          <option value="mainnet">Mainnet</option>
          <option value="l2">L2</option>
        </select>
      </div>
      <div>
        <label>Token</label><br/>
        <input value={token} onChange={e => onChange({ chain, network, token: e.target.value, range })}/>
      </div>
      <div>
        <label>Rango</label><br/>
        <select value={range} onChange={e => onChange({ chain, network, token, range: e.target.value })}>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
          <option value="90d">90 días</option>
        </select>
      </div>
    </>
  );
}

