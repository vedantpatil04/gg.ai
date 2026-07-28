import mongoose, { Document, Schema } from "mongoose";

export interface IMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IAIConversation extends Document {
  cityId: string;
  cityName: string;
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AIConversationSchema = new Schema<IAIConversation>(
  {
    cityId: { type: String, required: true, lowercase: true, index: true },
    cityName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, required: true, index: true },
    messages: [MessageSchema],
  },
  { timestamps: true },
);

AIConversationSchema.index({ sessionId: 1, createdAt: -1 });
AIConversationSchema.index({ userId: 1, createdAt: -1 });

export const AIConversation = mongoose.model<IAIConversation>(
  "AIConversation",
  AIConversationSchema,
);
