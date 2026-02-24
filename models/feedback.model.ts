import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type FeedbackStatus = 'unread' | 'read';

export interface IFeedback extends Document {
  userId:     Types.ObjectId;
  message:    string;
  status:     FeedbackStatus;
  readAt:     Date | null;
  createdAt:  Date;
  updatedAt:  Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    status:  { type: String, enum: ['unread', 'read'], default: 'unread' },
    readAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

FeedbackSchema.index({ status: 1, createdAt: -1 });

const Feedback: Model<IFeedback> =
  mongoose.models.Feedback ?? mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
