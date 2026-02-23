import mongoose, { Document, Schema, Model, Types } from 'mongoose';

/**
 * Per-user permission overrides.
 * granted=true  → explicit GRANT  (user gets this permission even if role doesn't)
 * granted=false → explicit REVOKE (user loses this permission even if role has it)
 */
export interface IUserPermission extends Document {
  userId:       Types.ObjectId;
  permissionId: Types.ObjectId;
  granted:      boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const UserPermissionSchema = new Schema<IUserPermission>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
    granted:      { type: Boolean, required: true },
  },
  { timestamps: true }
);

UserPermissionSchema.index({ userId: 1, permissionId: 1 }, { unique: true });

const UserPermission: Model<IUserPermission> =
  mongoose.models.UserPermission ??
  mongoose.model<IUserPermission>('UserPermission', UserPermissionSchema);

export default UserPermission;
