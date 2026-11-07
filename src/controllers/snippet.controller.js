import mongoose from "mongoose";
import { Snippet } from "../models/snippet.model.js";
import { connectDB } from "../config/db.js";

function formatRelativeTime(date) {
  if (!date) return "Recently";
  const diff = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return "Updated Yesterday";
  return `Updated ${Math.floor(diff / 86400)} days ago`;
}

function formatSnippet(snippet) {
  return {
    id: snippet._id.toString(),
    title: snippet.title,
    language: snippet.language,
    code: snippet.code || "",
    stdin: snippet.stdin || "",
    updated_at: snippet.updatedAt ? new Date(snippet.updatedAt).getTime() : Date.now(),
    updated: formatRelativeTime(snippet.updatedAt),
  };
}

export async function listSnippets(req, res) {
  await connectDB();
  try {
    const snippets = await Snippet.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(snippets.map(formatSnippet));
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch snippets: ${err.message}` });
  }
}

export async function createOrUpdateSnippet(req, res) {
  await connectDB();
  const { id, title, language, code, stdin } = req.body ?? {};
  const cleanTitle = (title || "Untitled Snippet").trim();

  try {
    // If an id is provided, verify ownership and update
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: "Snippet not found" });
      }

      const existing = await Snippet.findOne({ _id: id, userId: req.user.id });
      if (!existing) {
        // Enforce 404 if not found or not owner
        return res.status(404).json({ error: "Snippet not found" });
      }

      existing.title = cleanTitle;
      existing.language = language || existing.language;
      existing.code = code ?? "";
      existing.stdin = stdin ?? "";

      await existing.save();
      return res.status(200).json(formatSnippet(existing));
    }

    // Otherwise create a new snippet under the logged in user
    const newSnippet = await Snippet.create({
      userId: req.user.id,
      title: cleanTitle,
      language: language || "cpp",
      code: code ?? "",
      stdin: stdin ?? "",
    });

    res.status(201).json(formatSnippet(newSnippet));
  } catch (err) {
    res.status(500).json({ error: `Failed to save snippet: ${err.message}` });
  }
}

export async function deleteSnippet(req, res) {
  await connectDB();
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Snippet not found" });
  }

  try {
    const deleted = await Snippet.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      // Enforce 404 if not found or not owner
      return res.status(404).json({ error: "Snippet not found" });
    }

    res.json({ success: true, message: "Snippet deleted", deleted: id });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete snippet: ${err.message}` });
  }
}
