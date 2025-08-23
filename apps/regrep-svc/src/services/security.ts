import * as openpgp from "openpgp"; 
import fs from "fs/promises"; 
import path from "path"; 
 
export async function pgpEncryptAndSign(buf: Buffer, recipientsFiles: 
string[], sign=false) { 
  const keys = []; 
  for (const f of recipientsFiles) { 
    const p = path.isAbsolute(f) ? f : 
path.join(process.cwd(),"config","keys",f); 
    const txt = await fs.readFile(p, "utf8"); 
    const k = await openpgp.readKey({ armoredKey: txt }); 
    keys.push(k); 
  } 
  const message = await openpgp.createMessage({ binary: buf }); 
  const signed = sign ? await openpgp.readPrivateKey({ armoredKey: 
process.env.PGP_SIGN_KEY! }) : null; 
  const out = await openpgp.encrypt({ message, encryptionKeys: keys, 
signingKeys: sign && signed ? signed : undefined }); 
  return Buffer.from(out as string, "utf8"); 
} 
 
