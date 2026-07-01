"use client";

import { genreLabels, GENRE_GROUPS, type Genre } from "@/lib/constants";

type GenrePickerProps = {
  value: string;
  onChange: (genre: string) => void;
  variant?: "default" | "compact";
};

export function GenrePicker({ value, onChange, variant = "default" }: GenrePickerProps) {
  const chipClass = (g: string) =>
    variant === "compact"
      ? `rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          value === g
            ? "bg-[#53fc18] text-black font-bold"
            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
        }`
      : `rounded-lg py-2 px-3 text-sm transition-colors ${
          value === g
            ? "bg-[#53fc18] text-black font-bold"
            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
        }`;

  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
      {GENRE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.genres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange(g)}
                className={chipClass(g)}
              >
                {genreLabels[g as Genre] ?? g}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenreMultiPicker({
  selected,
  onToggle,
  max = 5,
}: {
  selected: string[];
  onToggle: (genre: string) => void;
  max?: number;
}) {
  return (
    <div className="space-y-4">
      {GENRE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.genres.map((genre) => {
              const isSelected = selected.includes(genre);
              const disabled = !isSelected && selected.length >= max;
              return (
                <button
                  key={genre}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(genre)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    isSelected
                      ? "border-[#53fc18] bg-[#53fc18]/10 text-[#53fc18]"
                      : disabled
                        ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  {genreLabels[genre]}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-zinc-600">Pick up to {max} genres you perform</p>
    </div>
  );
}
