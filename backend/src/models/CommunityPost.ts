import mongoose, { Document, Schema } from "mongoose";

export type PostType   = "discussion" | "question";
export type PostStatus = "open" | "resolved" | "closed";

export interface IReply {
  _id:        mongoose.Types.ObjectId;
  body:       string;
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  isBestAnswer: boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

export interface ICommunityPost extends Document {
  type:        PostType;
  title:       string;
  body:        string;
  category:    string;
  tags:        string[];
  authorId:    mongoose.Types.ObjectId;
  authorName:  string;
  status:      PostStatus;
  replies:     IReply[];
  replyCount:  number;
  views:       number;
  hasBestAnswer: boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const ReplySchema = new Schema<IReply>(
  {
    body:         { type: String, required: true, trim: true, maxlength: 5000 },
    authorId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName:   { type: String, required: true, trim: true, maxlength: 200 },
    isBestAnswer: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    type:      { type: String, enum: ["discussion", "question"], required: true },
    title:     { type: String, required: true, trim: true, maxlength: 300 },
    body:      { type: String, required: true, trim: true, maxlength: 10000 },
    category:  { type: String, required: true, trim: true, maxlength: 100 },
    tags:      [{ type: String, trim: true, maxlength: 50 }],
    authorId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName:{ type: String, required: true, trim: true, maxlength: 200 },
    status:    { type: String, enum: ["open", "resolved", "closed"], default: "open" },
    replies:   [ReplySchema],
    replyCount:{ type: Number, default: 0 },
    views:     { type: Number, default: 0 },
    hasBestAnswer: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CommunityPostSchema.index({ type: 1, status: 1, createdAt: -1 });
CommunityPostSchema.index({ authorId: 1 });
CommunityPostSchema.index({ title: "text", body: "text", tags: "text" });

export const CommunityPost = mongoose.model<ICommunityPost>("CommunityPost", CommunityPostSchema);
