import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ProjectPlatform = 'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'other';
export type ProjectStatus   = 'draft' | 'analyzing' | 'ready' | 'published';

export interface IProject extends Document {
  userId:      Types.ObjectId;
  title:       string;
  description: string;
  platform:    ProjectPlatform;
  status:      ProjectStatus;
  tags:        string[];
  deletedAt:   Date | null;
  createdAt:   Date;
  updatedAt:   Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    platform:    {
      type:    String,
      enum:    ['youtube', 'tiktok', 'instagram', 'linkedin', 'other'],
      default: 'other',
    },
    status:    {
      type:    String,
      enum:    ['draft', 'analyzing', 'ready', 'published'],
      default: 'draft',
    },
    tags:      { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, deletedAt: 1 });

const Project: Model<IProject> =
  mongoose.models.Project ?? mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
