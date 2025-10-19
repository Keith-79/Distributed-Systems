import mongoose from 'mongoose';

const CATEGORY_OPTIONS = ['Work', 'Personal', 'Shopping', 'Health', 'Other'];
const STATUS_ENUM = ['pending', 'in-progress', 'completed'];
const PRIORITY_ENUM = ['low', 'medium', 'high'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [100, 'Title must be at most 100 characters'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: { values: STATUS_ENUM, message: "Status must be one of: 'pending', 'in-progress', 'completed'" },
      default: 'pending',
      lowercase: true,
    },
    priority: {
      type: String,
      enum: { values: PRIORITY_ENUM, message: "Priority must be one of: 'low', 'medium', 'high'" },
      default: 'medium',
      lowercase: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: (v) => !isNaN(new Date(v).getTime()),
        message: 'Due date must be a valid date',
      },
    },
    category: {
      type: String,
      enum: { values: CATEGORY_OPTIONS, message: "Category must be one of: 'Work', 'Personal', 'Shopping', 'Health', 'Other'" },
      required: [true, 'Category is required'],
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('Task', taskSchema);
export { CATEGORY_OPTIONS, STATUS_ENUM, PRIORITY_ENUM };