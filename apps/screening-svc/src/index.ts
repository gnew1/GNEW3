import { app } from "./app"; 
const port = process.env.PORT || 8085; 
app.listen(port, () => console.log(`screening-svc :${port}`)); 
