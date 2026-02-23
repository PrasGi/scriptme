import mongoose, { Document, Schema, Model, Types } from 'mongoose';

/**
 * Maps a permission to a role (default permissions for the role).
 * When a user is assigned a role, they inherit all permissions in this table.
 */
export interface IRolePermission extends Document {
  roleId:       Types.ObjectId;
  permissionId: Types.ObjectId;
  createdAt:    Date;
  updatedAt:    Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId:       { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  },
  { timestamps: true }
);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

const RolePermission: Model<IRolePermission> =
  mongoose.models.RolePermission ??
  mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema);

export default RolePermission;
