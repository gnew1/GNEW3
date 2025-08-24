from pydantic import BaseModel, Field 
from typing import Optional, Literal, List, Dict 
 
class Tx(BaseModel): 
    txid: str 
    date: str                 # ISO date 
    country_code: str         # ISO-3166 alpha-2
    type: Literal["sale","service","grant","interest","royalty","expense"]
    customer_tax_id: Optional[str] = None 
    customer_is_business: bool = False 
    category: Optional[str] = None   # para mapear a tipos con tasa reducida
    currency: str 
    amount_net: float 
    vat_rate: Optional[float] = None 
    vat_amount: Optional[float] = None 
    withholding_applied: Optional[float] = None 
    account: Optional[str] = None     # cuenta contable 
 
class Consent(BaseModel): 
    subject_id: str            # user/vendor id 
    kind: Literal["W9","GDPR_TAX","CRS_KYC"] 
    version: str 
    accepted_at: str 
    payload_hash: str 
 
class WithholdingInput(BaseModel): 
    jurisdiction: str 
    payee_id: str 
    payee_tin: Optional[str] = None 
    amount_gross: float
    context: Dict[str,str] = Field(default_factory=dict)  # e.g.,
    # {"freelance":"true","reduced":"false"}
 
class WithholdingResult(BaseModel): 
    amount_gross: float 
    rate: float 
    amount_withheld: float 
    amount_net: float 
    reason: str 
 
 
