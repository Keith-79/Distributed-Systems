import { StatusCodes } from 'http-status-codes';

export function notFound(req, res, next) {
  res.status(StatusCodes.NOT_FOUND).json({ error: 'Not Found', message: `Route ${req.originalUrl} does not exist` });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    status = StatusCodes.BAD_REQUEST;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('; ');
  }
  if (err.name === 'CastError') {
    status = StatusCodes.BAD_REQUEST;
    message = 'Invalid ID format';
  }
  res.status(status).json({ error: StatusCodes[status] || 'Error', message });
}