import express, { type Application } from 'express';
import registerMissionsRoutes from './routes/missions.js';

const app: Application = express();
app.use(express.json({ limit: '1mb' }));

registerMissionsRoutes(app);

const port = process.env.PORT ? Number(process.env.PORT) : 3010;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
