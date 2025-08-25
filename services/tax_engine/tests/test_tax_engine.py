from services.tax_engine.withholding import compute_withholding, WithholdingInput
 
def test_withholding_es_freelance_general():
    inp = WithholdingInput(
        jurisdiction="ES", payee_id="u1",
        amount_gross=1000.0, context={"freelance":"true"}
    )
    res = compute_withholding(inp)
    assert round(res.amount_withheld, 2) == 150.00
    assert round(res.amount_net, 2) == 850.00
 
def test_withholding_us_backup():
    inp = WithholdingInput(
        jurisdiction="US", payee_id="p1",
        amount_gross=500.0, payee_tin=None, context={"w9":"false"}
    )
    res = compute_withholding(inp)
    assert round(res.amount_withheld, 2) == 120.00
    assert round(res.amount_net, 2) == 380.00
 
 
