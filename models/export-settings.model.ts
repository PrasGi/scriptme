import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ExportFormality = 'minimal' | 'standard' | 'formal';

export interface IExportSettings extends Document {
  userId:            Types.ObjectId;
  logoUrl:           string | null;
  headerPlaceholder: string | null;
  footerPlaceholder: string | null;
  formality:         ExportFormality;
  companyName:       string | null;
  tagline:           string | null;
  createdAt:         Date;
  updatedAt:         Date;
}

const ExportSettingsSchema = new Schema<IExportSettings>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    logoUrl:           { type: String, default: null, trim: true },
    headerPlaceholder: { type: String, default: null, trim: true },
    footerPlaceholder: { type: String, default: null, trim: true },
    formality:         { type: String, enum: ['minimal', 'standard', 'formal'], default: 'standard' },
    companyName:       { type: String, default: null, trim: true },
    tagline:           { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

ExportSettingsSchema.index({ userId: 1 }, { unique: true });

const ExportSettings: Model<IExportSettings> =
  mongoose.models.ExportSettings ?? mongoose.model<IExportSettings>('ExportSettings', ExportSettingsSchema);

export default ExportSettings;
