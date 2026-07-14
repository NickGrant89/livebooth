"use client";

import { STREAM_DESCRIPTION_MAX, STREAM_TITLE_MAX } from "@/lib/constants";

type StreamDetailsFieldsProps = {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  compact?: boolean;
};

export function StreamDetailsFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  titlePlaceholder = "Set title",
  descriptionPlaceholder = "What’s this set about? Tracklist vibes, guests, shout-outs…",
  compact = false,
}: StreamDetailsFieldsProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, STREAM_TITLE_MAX))}
          placeholder={titlePlaceholder}
          maxLength={STREAM_TITLE_MAX}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">
          Description <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, STREAM_DESCRIPTION_MAX))}
          placeholder={descriptionPlaceholder}
          maxLength={STREAM_DESCRIPTION_MAX}
          rows={compact ? 3 : 4}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white resize-y min-h-[4.5rem]"
        />
        <p className="text-[10px] text-zinc-600 mt-1 text-right">
          {description.length}/{STREAM_DESCRIPTION_MAX}
        </p>
      </div>
    </div>
  );
}
