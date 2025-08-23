from jsonschema import validate, Draft202012Validator 
from typing import List, Dict 
from lxml import etree 
 
SCHEMAS: Dict[str, dict] = { 
    "IVA-ES-303": { 
        "type": "object", 
        "required": ["period","taxpayer_vat","totals"], 
        "properties": { 
            "period": {"type":"string"}, 
            "taxpayer_vat": {"type":"string"}, 
            "totals": { 
                "type":"object", 
                "required": 
["base_standard","vat_standard","base_reduced","vat_reduced"], 
                "properties": { "base_standard":{"type":"number"}, 
"vat_standard":{"type":"number"}, 
                                "base_reduced":{"type":"number"}, 
"vat_reduced":{"type":"number"} } 
            } 
        } 
    }, 
    "IS-ES-PagosFracc": { 
        "type": "object", 
        "required": ["fy","q","base","rate","amount"], 
        "properties": { "fy":{"type":"integer"}, 
"q":{"type":"integer"}, "base":{"type":"number"}, 
"rate":{"type":"number"}, "amount":{"type":"number"} } 
    }, 
    "IRPF-111": { 
        "type": "object", 
        "required": ["fy","q","withheld_total","records"], 
        "properties": { "fy":{"type":"integer"}, 
"q":{"type":"integer"}, "withheld_total":{"type":"number"}, 
"records":{"type":"array"} } 
    }, 
    "1099NEC": { 
        "type": "object", 
        "required": ["payer","payee","box1","box4","tax_year"], 
        "properties": { 
            "tax_year": {"type":"integer"}, 
            
"payer":{"type":"object","required":["payer_name","payer_tin"]}, 
            
"payee":{"type":"object","required":["payee_name","payee_tin"]}, 
            "box1":{"type":"number"}, 
            "box4":{"type":"number"} 
        } 
    }, 
    "CRS_XML": { 
        "type":"object", 
        "required":["reporting_period","accounts"], 
        "properties":{"reporting_period":{"type":"string"}, 
"accounts":{"type":"array"}} 
    } 
} 
 
def validate_payload(model: str, payload: dict) -> list[str]: 
    if model not in SCHEMAS: 
        return [f"schema {model} not found"] 
    v = Draft202012Validator(SCHEMAS[model]) 
    errs = [f"{'/'.join(map(str,e.path))}: {e.message}" for e in 
v.iter_errors(payload)] 
    return errs 
 
def validate_xml(xsd_path: str, xml_bytes: bytes) -> list[str]: 
    try: 
        xmlschema_doc = etree.parse(xsd_path) 
        xmlschema = etree.XMLSchema(xmlschema_doc) 
        xml_doc = etree.fromstring(xml_bytes) 
        xmlschema.assertValid(xml_doc) 
        return [] 
    except Exception as e: 
        return [str(e)] 
 
 
