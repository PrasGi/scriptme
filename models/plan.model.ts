import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IPlan extends Document {
  name:              string;
  slug:              string;
  priceMonthly:      number | null;
  discount1Month:    number;
  discount3Months:   number;
  discount6Months:   number;
  tokenLimitMonthly: number | null;
  features:          string[];
  cta:               string;
  badge:             string | null;
  isActive:          boolean;
  order:             number;
  createdAt:         Date;
  updatedAt:         Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name:              { type: String, required: true, trim: true },
    slug:              { type: String, required: true, unique: true, trim: true, lowercase: true },
    priceMonthly:      { type: Number, default: null },
    discount1Month:    { type: Number, default: 0 },
    discount3Months:   { type: Number, default: 0 },
    discount6Months:   { type: Number, default: 0 },
    tokenLimitMonthly: { type: Number, default: null },
    features:          { type: [String], default: [] },
    cta:               { type: String, required: true, trim: true },
    badge:             { type: String, default: null },
    isActive:          { type: Boolean, default: true },
    order:             { type: Number, default: 0 },
  },
  { timestamps: true }
);

PlanSchema.index({ slug: 1 });
PlanSchema.index({ isActive: 1, order: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan ?? mongoose.model<IPlan>('Plan', PlanSchema);

export default Plan;
