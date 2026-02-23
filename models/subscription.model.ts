import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type SubscriptionSource = 'trial' | 'purchase' | 'admin_grant';

export interface ISubscription extends Document {
  userId:         Types.ObjectId;
  planId:         Types.ObjectId;
  startedAt:      Date;
  endsAt:         Date;
  source:         SubscriptionSource;
  transactionId:  Types.ObjectId | null;
  createdAt:      Date;
  updatedAt:      Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId:        { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    startedAt:     { type: Date, required: true },
    endsAt:        { type: Date, required: true },
    source:        { type: String, enum: ['trial', 'purchase', 'admin_grant'], required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ endsAt: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ?? mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

export default Subscription;
