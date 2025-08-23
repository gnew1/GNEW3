import { app } from "./app"; 
const port = process.env.PORT || 8087; 
app.listen(port, ()=>console.log(`jurisdiction-svc :${port}`)); 
