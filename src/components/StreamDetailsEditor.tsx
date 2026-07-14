"use client";

import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { StreamDetailsFields } from "@/components/StreamDetailsFields";

type StreamDetailsEditorProps = {
  streamId: string;
  initialTitle: string;
  initialDescription?: string | null;
  canEdit: boolean;
  variant?: "vod" | "live";
};

export function StreamDetailsEditor({
  streamId,
  initialTitle,
  initialDescription = "",
  canEdit,
  variant = "vod",
}: StreamDetailsEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [draftDescription, setDraftDescription] = useState(initialDescription ?? "");

  async function save() {
    setSaving(true);
    setError("");
    const res = await apiFetch(`/api/streams/${streamId}/details`, {
      method: "PATCH",
      body: JSON.stringify({
        title: draftTitle,
        description: draftDescription,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Could not save");
      return;
    }
    const updated = (data as { stream: { title: string; description: string } }).stream;
    setTitle(updated.title);
    setDescription(updated.description);
    setEditing(false);
  }

  function cancel() {
    setDraftTitle(title);
    setDraftDescription(description);
    setEditing(false);
    setError("");
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-[#53fc18]/25 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-[#53fc18] uppercase tracking-wider">
          Edit {variant === "live" ? "live show" : "replay"} details
        </p>
        <StreamDetailsFields
          title={draftTitle}
          description={draftDescription}
          onTitleChange={setDraftTitle}
          onDescriptionChange={setDraftDescription}
          compact
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !draftTitle.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm text-zinc-300"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={`font-bold truncate ${variant === "vod" ? "text-xl" : "text-base sm:text-lg"}`}>
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap break-words">{description}</p>
          ) : canEdit ? (
            <p className="text-sm text-zinc-600 mt-1 italic">No description yet — add one so fans know what this set is about.</p>
          ) : null}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setDraftTitle(title);
              setDraftDescription(description);
              setEditing(true);
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-[#53fc18]/30 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
