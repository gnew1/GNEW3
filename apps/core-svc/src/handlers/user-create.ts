import { tagResource, minimizeObject } from 
"../../../packages/retention-sdk/src"; 
import { prisma } from "../infra/prisma"; 
export async function createUser(input: any) { 
// Minimización para personalization (del policy snapshot) 
const minimized = minimizeObject(input, ["subjectId", "preferences", 
"locale"]); 
const user = await prisma.user.create({ data: minimized }); 
await tagResource(process.env.RETENTION_API!, { 
subjectId: user.subjectId, system: "postgres:core.users", 
resourceType: "public.User", 
resourceId: user.id, dataCategory: "profile", purpose: 
"personalization", baseLegal: "consent", region: "EU" 
}); 
return user; 
} 
IaC — S3 Lifecycle (delegado) 
