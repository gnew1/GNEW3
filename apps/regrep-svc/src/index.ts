import { app } from "./app"; 
import "./jobs/scheduler"; 
const port = process.env.PORT || 8088; 
app.listen(port, ()=>console.log(`regrep-svc :${port}`)); 
