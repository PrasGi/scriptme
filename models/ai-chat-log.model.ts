import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type AiChatMode = 'generate' | 'analyze' | 'regenerate' | 'chat' | 'clone';

export interface IAiChatLog extends Document {
  userId:           Types.ObjectId;
  sessionId:        string;
  mode:             AiChatMode;
  message:          string;
  response:         string;
  characterContext?: string;
  projectId?:       Types.ObjectId;
  scriptId?:        Types.ObjectId;
  /** Token usage (estimated if not from API) */
  inputTokens?:     number;
  outputTokens?:    number;
  totalTokens?:     number;
  /** Cost in USD (estimated for Gemini 2.5 Flash) */
  costUsd?:         number;
  createdAt:        Date;
}

const AiChatLogSchema = new Schema<IAiChatLog>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId:        { type: String, required: true },
    mode:             { type: String, enum: ['generate', 'analyze', 'regenerate', 'chat', 'clone'], required: true },
    message:          { type: String, required: true },
    response:         { type: String, default: '' },
    characterContext: { type: String },
    projectId:        { type: Schema.Types.ObjectId, ref: 'Project' },
    scriptId:         { type: Schema.Types.ObjectId, ref: 'Script' },
    inputTokens:      { type: Number },
    outputTokens:     { type: Number },
    totalTokens:      { type: Number },
    costUsd:          { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiChatLogSchema.index({ userId: 1, createdAt: -1 });
AiChatLogSchema.index({ createdAt: -1 });

// In dev, drop cached model so hot reload picks up schema changes (e.g. new enum value 'clone')
if (process.env.NODE_ENV === 'development' && mongoose.models.AiChatLog) {
  delete mongoose.models.AiChatLog;
}

const AiChatLog: Model<IAiChatLog> =
  mongoose.models.AiChatLog ?? mongoose.model<IAiChatLog>('AiChatLog', AiChatLogSchema);

export default AiChatLog;
