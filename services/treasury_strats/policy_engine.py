from __future__ import annotations 
from dataclasses import dataclass 
from decimal import Decimal 
from typing import Optional 
 
@dataclass 
class OracleSnapshot: 
    px_in_e8: int 
    px_out_e8: int 
 
@dataclass 
class Policy: 
    max_slippage_bps: int         # 100 = 1% 
    min_out_bps_of_oracle: int    # 9900 = 99% 
    max_move_bps: int             # pause if |Δ| > this 
    amount_in: Decimal 
 
def compute_price_e18(o: OracleSnapshot) -> int: 
    # (in / 1e8) / (out / 1e8) * 1e18 
    return int((Decimal(o.px_in_e8) / Decimal(o.px_out_e8)) * 
Decimal(10**18)) 
 
def expected_out(amount_in_wei: int, price_e18: int) -> int: 
    return (amount_in_wei * price_e18) // 10**18 
 
def min_out_from_policy(amount_in_wei: int, price_e18: int, pol: 
Policy) -> int: 
    exp_out = expected_out(amount_in_wei, price_e18) 
    min_out = (exp_out * pol.min_out_bps_of_oracle) // 10_000 
    # Hard slippage bound (more strict) 
    hard = (exp_out * (10_000 - pol.max_slippage_bps)) // 10_000 
    return max(min_out, hard) 
 
def should_market_pause(last_price_e18: int, new_price_e18: int, 
max_move_bps: int) -> bool: 
    a, b = Decimal(last_price_e18), Decimal(new_price_e18) 
    if a == b: return False 
    mid = (a + b) / Decimal(2) 
    move = abs(a - b) / mid 
    return (move * 10_000) > max_move_bps 
 
