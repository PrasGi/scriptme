import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type VoucherType = 'percent' | 'fixed';

export interface IVoucher extends Document {
  code:         string;
  type:         VoucherType;
  value:        number;
  validFrom:    Date;
  validTo:      Date;
  usageLimit:   number | null;
  usageCount:   number;
  perUserLimit: number | null;
  planIds:      Types.ObjectId[];
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code:         { type: String, required: true, unique: true, trim: true, uppercase: true },
    type:         { type: String, enum: ['percent', 'fixed'], required: true },
    value:        { type: Number, required: true },
    validFrom:    { type: Date, required: true },
    validTo:      { type: Date, required: true },
    usageLimit:   { type: Number, default: null },
    usageCount:   { type: Number, default: 0 },
    perUserLimit: { type: Number, default: null },
    planIds:      { type: [Schema.Types.ObjectId], ref: 'Plan', default: [] },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

VoucherSchema.index({ code: 1 });
VoucherSchema.index({ validFrom: 1, validTo: 1 });

const Voucher: Model<IVoucher> =
  mongoose.models.Voucher ?? mongoose.model<IVoucher>('Voucher', VoucherSchema);

export default Voucher;
