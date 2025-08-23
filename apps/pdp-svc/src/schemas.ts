import Ajv from "ajv"; 
import access from 
"../../policy-contracts/schemas/access.input.schema.json"; 
import payments from 
"../../policy-contracts/schemas/payments.input.schema.json"; 
const ajv = new Ajv({ allErrors: true, removeAdditional: false }); 
const validators = { 
access: ajv.compile(access as any), 
payments: ajv.compile(payments as any), 
}; 
export function validateInput(kind:"access"|"payments", data:any) { 
const ok = validators[kind](data); 
if (!ok) throw new Error("INVALID_INPUT " + 
JSON.stringify(validators[kind].errors)); 
} 
