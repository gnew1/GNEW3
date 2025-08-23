import { app } from "./app"; 
import "./jobs/anchor-batches"; 
const port = process.env.PORT || 8091; 
app.listen(port, ()=>console.log(`esign-svc :${port}`)); 
