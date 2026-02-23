import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface ITransaction extends Document {
  userId:             Types.ObjectId;
  planId:             Types.ObjectId;
  months:             number;
  amountIdr:          number;
  discountPercent:    number;
  voucherId:          Types.ObjectId | null;
  voucherCode:        string | null;
  voucherDiscountIdr: number | null;
  status:             TransactionStatus;
  paymentMethod:      string | null;
  paymentDetail:      Record<string, unknown> | null;
  completedAt:        Date | null;
  completedBy:        Types.ObjectId | null;
  createdAt:          Date;
  updatedAt:          Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId:             { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    months:             { type: Number, required: true, enum: [1, 3, 6] },
    amountIdr:          { type: Number, required: true },
    discountPercent:    { type: Number, default: 0 },
    voucherId:          { type: Schema.Types.ObjectId, ref: 'Voucher', default: null },
    voucherCode:        { type: String, default: null },
    voucherDiscountIdr: { type: Number, default: null },
    status:             { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
    paymentMethod:      { type: String, default: null },
    paymentDetail:      { type: Schema.Types.Mixed, default: null },
    completedAt:       { type: Date, default: null },
    completedBy:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ?? mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
