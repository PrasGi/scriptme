import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type CharacterPlatform = 'youtube' | 'tiktok' | 'instagram' | 'custom';
export type CharacterSourceType = 'cloned' | 'custom';

export interface ICharacter extends Document {
  userId:       Types.ObjectId;
  name:         string;
  description:  string;
  platform:     CharacterPlatform;
  sourceType:   CharacterSourceType;
  sourceUrl?:   string;
  sourceAuthor?: string;
  sourceVideoId?: string;
  accentColor:  string;
  deletedAt:    Date | null;
  createdAt:    Date;
  updatedAt:    Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, required: true, trim: true },
    description:  { type: String, required: true, trim: true },
    platform:     {
      type:    String,
      enum:    ['youtube', 'tiktok', 'instagram', 'custom'],
      default: 'custom',
    },
    sourceType:   {
      type:    String,
      enum:    ['cloned', 'custom'],
      default: 'custom',
    },
    sourceUrl:    { type: String, default: '' },
    sourceAuthor: { type: String, default: '' },
    sourceVideoId: { type: String, default: '' },
    accentColor:  { type: String, default: '#06B6D4' },
    deletedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

CharacterSchema.index({ userId: 1, deletedAt: 1 });

const Character: Model<ICharacter> =
  mongoose.models.Character ?? mongoose.model<ICharacter>('Character', CharacterSchema);

export default Character;
