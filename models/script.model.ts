import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ScriptSourceType = 'manual' | 'tiktok' | 'ai';
export type ScriptStatus     = 'draft' | 'analyzing' | 'ready';

export interface ScriptLine {
  startTime:  string;  // e.g. '00:00:00.760'
  endTime:    string;  // e.g. '00:00:01.360'
  text:       string;
  flagColor?: string;  // hex e.g. '#FF5733' — when set, line is flagged
}

export interface AnalyzeLine {
  lineIndex:  number;
  text:       string;
  type:       'actionable' | 'informational';
  suggestion: string;
  reason:     string;
}

export interface IScript extends Document {
  projectId:       Types.ObjectId;
  userId:          Types.ObjectId;
  title:           string;
  characterId:     Types.ObjectId | null;
  sourceType:      ScriptSourceType;
  sourceTiktokUrl: string;
  lines:           ScriptLine[];
  plainText:       string;
  status:          ScriptStatus;
  analyzeResult:   AnalyzeLine[] | null;
  shareToken:      string | null;
  deletedAt:       Date | null;
  createdAt:       Date;
  updatedAt:       Date;
}

const ScriptLineSchema = new Schema<ScriptLine>(
  {
    startTime:  { type: String, required: true },
    endTime:    { type: String, required: true },
    text:       { type: String, required: true },
    flagColor:  { type: String, default: null },
  },
  { _id: false }
);

const ScriptSchema = new Schema<IScript>(
  {
    projectId:       { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    userId:          { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    title:           { type: String, required: true, trim: true },
    characterId:     { type: Schema.Types.ObjectId, ref: 'Character', default: null },
    sourceType:      {
      type:    String,
      enum:    ['manual', 'tiktok', 'ai'],
      default: 'manual',
    },
    sourceTiktokUrl: { type: String, default: '' },
    lines:           { type: [ScriptLineSchema], default: [] },
    plainText:       { type: String, default: '' },
    status:          {
      type:    String,
      enum:    ['draft', 'analyzing', 'ready'],
      default: 'draft',
    },
    analyzeResult: { type: Schema.Types.Mixed, default: null },
    shareToken:    { type: String, default: null, unique: true, sparse: true },
    deletedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

ScriptSchema.index({ projectId: 1, deletedAt: 1 });
ScriptSchema.index({ userId: 1 });

const Script: Model<IScript> =
  mongoose.models.Script ?? mongoose.model<IScript>('Script', ScriptSchema);

export default Script;
