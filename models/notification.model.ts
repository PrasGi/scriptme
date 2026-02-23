import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface INotification extends Document {
  userId:      Types.ObjectId;
  title:       string;
  body:        string;
  readAt:      Date | null;
  createdBy:   Types.ObjectId;
  createdAt:   Date;
  updatedAt:   Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title:     { type: String, required: true, trim: true },
    body:      { type: String, default: '', trim: true },
    readAt:    { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
