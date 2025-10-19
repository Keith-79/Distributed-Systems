import { StatusCodes } from 'http-status-codes';
import Task from '../models/Task.js';

export const createTask = async (req, res) => {
  const task = await Task.create(req.body);
  res.status(StatusCodes.CREATED).json(task);
};

export const getTasks = async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json(tasks);
};

export const getTaskById = async (req, res) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Not Found', message: 'Task not found' });
  res.status(StatusCodes.OK).json(task);
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const updated = await Task.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Not Found', message: 'Task not found' });
  res.status(StatusCodes.OK).json(updated);
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;
  const result = await Task.findByIdAndDelete(id);
  if (!result) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Not Found', message: 'Task not found' });
  res.status(StatusCodes.NO_CONTENT).send();
};