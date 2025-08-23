import { app } from "./app"; 
const port = process.env.PORT || 8090; 
app.listen(port, ()=>console.log(`pdp-svc on :${port}`)); 
 
