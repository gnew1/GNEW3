 1.yaml 
version: 1 
features: 
  vote: 
    w: 3.0 
    half_life_days: 60 
    vmax: 1 
    rate_star: 3   # máx. votos/día sin penalización 
  proposal_accepted: 
    w: 8.0 
    half_life_days: 120 
    vmax: 5 
    monthly_cap: 4 
  reward_claim: 
    w: 4.0 
    half_life_days: 45 
    clip_pct: 0.95 
  sbt_badge: 
    w: 5.0 
    half_life_days: 180 
    unique: true 
  pr_merged: 
    w: 6.0 
    half_life_days: 30 
    saturate: 
      type: logistic 
      alpha: 1.0 
      b: 0.15 
      c: 30 
  code_review: 
    w: 3.5 
    half_life_days: 21 
  forum_answer: 
    w: 2.0 
    half_life_days: 14 
  stake_time_gnew0: 
    w: 2.5 
    half_life_days: 90 
    cap_multiplier: 1.2 
antigaming: 
  velocity: 
    window_days: 7 
  diversity: 
    window_days: 30 
    gamma0: 0.6 
    gamma1: 0.2 
  collusion: 
    counterpart_window_days: 30 
    beta_max_penalty: 0.4 
  quality: 
    floor: 0.8 
    ceil: 1.5 
normalization: 
  alpha: 1.0 
  cap: 1000 
audit: 
  data_dictionary_uri: ipfs://TOFILL 
 
 
