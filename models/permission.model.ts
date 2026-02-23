import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPermission extends Document {
  resource: string;   // e.g. 'project', 'character', 'billing'
  action: string;     // e.g. 'create', 'read', 'update', 'delete'
  scope: 'own' | 'all';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource:    { type: String, required: true, trim: true, lowercase: true },
    action:      { type: String, required: true, trim: true, lowercase: true },
    scope:       { type: String, enum: ['own', 'all'], required: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Compound unique index: one permission per resource+action+scope
PermissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });

const Permission: Model<IPermission> =
  mongoose.models.Permission ?? mongoose.model<IPermission>('Permission', PermissionSchema);

export default Permission;
