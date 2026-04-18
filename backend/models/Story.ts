import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  authorId:     mongoose.Types.ObjectId;
  mediaUrls:    string[];
  mediaTypes:   ('image' | 'video')[];
  filter:       string;
  duration:     number;
  textOverlays: { text: string; x: number; y: number; fontSize: number; color: string; fontFamily: string }[];
  viewedBy:     mongoose.Types.ObjectId[];
  expiresAt:    Date;
  createdAt:    Date;
}

const storySchema = new Schema<IStory>(
  {
    authorId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrls:    { type: [String], required: true },
    mediaTypes:   { type: [String], enum: ['image', 'video'], default: [] },
    filter:       { type: String, default: 'none' },
    duration:     { type: Number, default: 5, min: 3, max: 15 },
    textOverlays: [{
      text:       { type: String },
      x:          { type: Number },
      y:          { type: Number },
      fontSize:   { type: Number },
      color:      { type: String },
      fontFamily: { type: String },
    }],
    viewedBy:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt:    { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const Story = mongoose.models.Story || mongoose.model<IStory>('Story', storySchema);
