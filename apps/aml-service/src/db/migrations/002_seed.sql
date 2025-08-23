
-- Seed a simple linear model and a couple of sanctions for tests/pilots
insert into aml_model(id, cfg) values('active', '{
  "weights": { "amount": 0.008, "velocity": 0.5, "crossBorder": 0.9, "channelCrypto": 0.7, "kycLow": 0.6, "pep": 0.8, "sanction": 3.0 },
  "bias": -2.0,
  "means": { "amount": 100.0, "velocity": 1.0, "crossBorder": 0.1, "channelCrypto": 0.1, "kycLow": 0.1, "pep": 0.05, "sanction": 0.0 },
  "stds":  { "amount": 200.0, "velocity": 2.0, "crossBorder": 0.3, "channelCrypto": 0.3, "kycLow": 0.3, "pep": 0.2, "sanction": 1.0 },
  "thresholdL1": 0.75,
  "thresholdL2": 0.9,
  "mode": "shadow"
}') on conflict (id) do nothing;

insert into sanctions(type,name,country,wallet,doc) values
('person','John Doe','US',null,'OFAC-TEST'),
('wallet','-',null,'0x000000000000000000000000000000000000dead','OFAC-ADDR')
on conflict (name, wallet) do nothing;


