from .models import WithholdingInput, WithholdingResult
 
def compute_withholding(inp: WithholdingInput) -> WithholdingResult: 
    """ 
    Reglas simplificadas: 
    - ES IRPF freelance: 15% (7% reducido si 'reduced'="true") 
    - US 1099 backup withholding: 24% si no hay TIN 
válido/consentimiento W-9 
    - Por defecto, 0% 
    """ 
    j = inp.jurisdiction.upper() 
    rate = 0.0 
    reason = "none" 
 
    if j == "ES": 
        if inp.context.get("freelance","false").lower() == "true": 
            if inp.context.get("reduced","false").lower() == "true": 
                rate = 0.07; reason = "IRPF freelance reducido" 
            else: 
                rate = 0.15; reason = "IRPF freelance general" 
    elif j == "US":
        # backup withholding si TIN ausente/incorrecto o sin W9
        tin = inp.payee_tin or ""
        tin_ok = tin.isdigit() and len(tin) == 9
        has_w9 = inp.context.get("w9","false").lower() == "true"
        if not (tin_ok and has_w9):
            rate = 0.24; reason = "Backup withholding 26 USC §3406"
    # TODO: añadir otros países 
 
    amount_withheld = round(inp.amount_gross * rate, 2) 
    amount_net = round(inp.amount_gross - amount_withheld, 2) 
    return WithholdingResult( 
        amount_gross=inp.amount_gross, rate=rate, 
        amount_withheld=amount_withheld, amount_net=amount_net, 
reason=reason 
    ) 
 
 
