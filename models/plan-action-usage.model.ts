import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type PlanActionName =
  | 'project_create'
  | 'save'
  | 'export'
  | 'analyze'
  | 'fetch'
  | 'read_mode'
  | 'character_create';

export interface IPlanActionUsage extends Omit<Document, 'save'> {
  userId: Types.ObjectId;
  /** Billing period, e.g. "2025-02" (UTC month) */
  period: string;
  project_create: number;
  /** Script creates this period (name avoids Document.save). */
  save: number;
  exportCount: number;
  analyze: number;
  fetch: number;
  read_mode: number;
  character_create: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanActionUsageSchema = new Schema<IPlanActionUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true },
    project_create: { type: Number, default: 0 },
    save: { type: Number, default: 0 },
    exportCount: { type: Number, default: 0 },
    analyze: { type: Number, default: 0 },
    fetch: { type: Number, default: 0 },
    read_mode: { type: Number, default: 0 },
    character_create: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PlanActionUsageSchema.index({ userId: 1, period: 1 }, { unique: true });

const PlanActionUsage: Model<IPlanActionUsage> =
  mongoose.models.PlanActionUsage ??
  mongoose.model<IPlanActionUsage>('PlanActionUsage', PlanActionUsageSchema);

export default PlanActionUsage;
