import { app } from "./app"; 
const port = process.env.PORT || 8083; 
app.listen(port, () => console.log(`retention-svc :${port}`)); 
