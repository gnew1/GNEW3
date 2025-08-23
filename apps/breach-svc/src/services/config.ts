import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
export async function loadPolicies() { 
const p = path.join(process.cwd(), "config", "policies.yml"); 
const raw = await fs.readFile(p, "utf8"); 
return yaml.parse(raw); 
} 
export async function loadTemplate(relPath: string) { 
const p = path.join(process.cwd(), "config", relPath); 
return await fs.readFile(p, "utf8"); 
} 
