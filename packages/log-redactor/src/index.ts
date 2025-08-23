const patterns = [/\"email\"\s*:\s*\"[^\"]+\"/gi, 
/\"ip\"\s*:\s*\"[0-9\.:a-f]+\"/gi, /\"phone\"\s*:\s*\"[^\"]+\"/gi]; 
export function redactPII(s: string) { return patterns.reduce((acc, 
rx) => acc.replace(rx, '"$1":"[REDACTED]"'), s); } 
 
 
CI/CD (GitHub Actions) 
