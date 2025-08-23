import { Router } from "express"; 
 
const router = Router(); 
 
router.get("/dora", async (_req, res) => { 
  const data = { 
    "Deployment Frequency": { value: 8, target: 10 }, 
    "Lead Time for Changes": { value: 30, target: 24 }, 
    "Change Failure Rate": { value: 7, target: 5 }, 
    "MTTR": { value: 15, target: 12 }, 
  }; 
  res.json( 
    Object.entries(data).map(([name, { value, target }]) => ({ 
      name, 
      value, 
      target, 
    })) 
  ); 
}); 
 
export default router; 
 
 
 
 
 Rituales de mejora continua 
 
 
