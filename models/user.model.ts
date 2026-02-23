import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name:            string;
  email:           string;
  password?:       string;      // undefined for OAuth-only accounts
  image?:          string;
  googleId?:       string;
  githubId?:       string;
  roleId:          Types.ObjectId;
  planId?:         Types.ObjectId | null;
  subscriptionId?: Types.ObjectId | null;
  isActive:        boolean;
  deletedAt:       Date | null;  // soft delete — null means active
  emailVerified:   Date | null;
  createdAt:       Date;
  updatedAt:       Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:      { type: String, select: false },     // never returned by default
    image:         { type: String },
    googleId:      { type: String, sparse: true },
    githubId:      { type: String, sparse: true },
    roleId:        { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    planId:        { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
    isActive:      { type: Boolean, default: true },
    deletedAt:     { type: Date, default: null },
    emailVerified: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method — compare plain password with hash
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
