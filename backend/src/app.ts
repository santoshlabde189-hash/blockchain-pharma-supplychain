import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { notifyService } from './services/notify';
import { startEventListener } from './services/eventListener';

// Routers
import { authRouter } from './routes/auth';
import { orgsRouter } from './routes/orgs';
import { productsRouter } from './routes/products';
import { batchesRouter } from './routes/batches';
import { shipmentsRouter } from './routes/shipments';
import { inventoryRouter } from './routes/inventory';
import { verifyRouter } from './routes/verify';
import { recallsRouter } from './routes/recalls';
import { alertsRouter } from './routes/alerts';

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', socket => {
  socket.on('joinOrg', (orgId: string) => {
    socket.join(`org:${orgId}`);
  });
});

notifyService.init(io);
startEventListener();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// API v1 Routes per 05-API-Specification.md
const apiRouter = express.Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/orgs', orgsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/batches', batchesRouter);
apiRouter.use('/shipments', shipmentsRouter);
apiRouter.use('/', inventoryRouter);
apiRouter.use('/', verifyRouter);
apiRouter.use('/recalls', recallsRouter);
apiRouter.use('/', alertsRouter);

app.use('/api/v1', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

export { app, server };
