
import pytest
import pandas as pd
from services.simulation import m7_tokenomics_simulation as sim

def test_simulation_runs():
    assert isinstance(sim.df, pd.DataFrame)
    assert "supply_gnew" in sim.df.columns
    assert "contributors" in sim.df.columns

def test_growth_positive():
    assert sim.df["supply_gnew"].iloc[-1] > sim.initial_state["supply_gnew"]


