
"""
M7: Simulación Económica y Tokenomics (cadCAD/ABM)
Implementación base de un modelo cadCAD para simular la economía de GNEW.
"""

import pandas as pd
from cadCAD.engine import ExecutionMode, ExecutionContext, Executor
from cadCAD.configuration import Experiment
from cadCAD.configuration.utils import config_sim
from cadCAD import configs

# Parámetros iniciales
initial_state = {
    "supply_gnew": 1_000_000,
    "supply_gnew0": 10_000,
    "price_gnew": 1.0,
    "price_gnew0": 0.1,
    "contributors": 100,
}

# Parámetros del modelo
params = {
    "growth_rate": [0.01],  # crecimiento de supply
    "contributor_inflow": [5],  # nuevos contribuyentes por tick
}

# Funciones de políticas
def policy_growth(params, step, sL, s, **kwargs):
    return {"new_supply": s["supply_gnew"] * params["growth_rate"]}

def policy_contributors(params, step, sL, s, **kwargs):
    return {"new_contributors": params["contributor_inflow"]}

# Funciones de actualización de estado
def update_supply_gnew(params, step, sL, s, inputs):
    return ("supply_gnew", s["supply_gnew"] + inputs["new_supply"])

def update_contributors(params, step, sL, s, inputs):
    return ("contributors", s["contributors"] + inputs["new_contributors"])

partial_state_update_blocks = [
    {
        "policies": {
            "growth": policy_growth,
            "contributors": policy_contributors,
        },
        "variables": {
            "supply_gnew": update_supply_gnew,
            "contributors": update_contributors,
        },
    }
]

sim_config = config_sim(
    {
        "T": range(10),  # 10 ticks
        "N": 1,
        "M": params,
    }
)

exp = Experiment()
exp.append_configs(
    sim_configs=sim_config,
    initial_state=initial_state,
    partial_state_update_blocks=partial_state_update_blocks,
)

exec_mode = ExecutionMode()
local_mode_ctx = ExecutionContext(exec_mode.local_mode)
executor = Executor(local_mode_ctx, configs)
raw_result, tensor_field, sessions = executor.execute()
df = pd.DataFrame(raw_result)

if __name__ == "__main__":
    print(df[["supply_gnew", "contributors"]])


