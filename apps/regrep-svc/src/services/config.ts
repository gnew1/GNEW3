import fs from "fs/promises"; 
import path from "path"; 
import yaml from "yaml"; 
export async function loadConfig() { 
const p = path.join(process.cwd(), "config", "reports.yml"); 
const raw = await fs.readFile(p, "utf8"); 
  return yaml.parse(raw); 
} 
 
