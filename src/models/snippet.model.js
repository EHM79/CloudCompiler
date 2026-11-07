import mongoose from "mongoose";

const snippetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Untitled Snippet",
      maxlength: [120, "Title must be under 120 characters"],
    },
    language: {
      type: String,
      required: true,
      default: "cpp",
    },
    code: {
      type: String,
      default: "",
    },
    stdin: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Snippet = mongoose.models.Snippet || mongoose.model("Snippet", snippetSchema);

