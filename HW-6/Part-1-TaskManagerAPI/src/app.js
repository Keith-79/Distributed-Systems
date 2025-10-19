import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import taskRoutes from './routes/taskRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', taskRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;