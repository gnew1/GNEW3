import { app } from "./app"; 
const port = process.env.PORT || 8082; 
app.listen(port, ()=>console.log(`dsar-svc on :${port}`)); 
