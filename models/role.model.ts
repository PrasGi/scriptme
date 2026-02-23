import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;           // 'admin' | 'creator' | 'viewer'
  description: string;
  isDefault: boolean;     // assigned to new users automatically
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name:        { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    isDefault:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Role: Model<IRole> =
  mongoose.models.Role ?? mongoose.model<IRole>('Role', RoleSchema);

export default Role;
