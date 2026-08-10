import express from 'express';
import http from 'http';

import { setupWebSocket } from './websocket';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/', (_, res) => {
  res.json({
    status: 'Voice Agent Backend',
  });
});

const server = http.createServer(app);

setupWebSocket(server);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});