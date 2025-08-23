import { app } from "./app"; 
import "./jobs/scheduler"; 
const port = process.env.PORT || 8092; 
app.listen(port, ()=>console.log(`breach-svc :${port}`)); 
