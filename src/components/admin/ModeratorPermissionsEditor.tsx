"use client";

import {
  MODERATOR_PERMISSIONS,
  type ModeratorPermissionId,
  DEFAULT_MODERATOR_PERMISSIONS,
} from "@/lib/staff-roles";

type Props = {
  value: ModeratorPermissionId[];
  onChange: (next: ModeratorPermissionId[]) => void;
  compact?: boolean;
};

export function ModeratorPermissionsEditor({ value, onChange, compact = false }: Props) {
  const selected = new Set(value);

  function toggle(id: ModeratorPermissionId) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const arr = MODERATOR_PERMISSIONS.map((p) => p.id).filter((p) => next.has(p));
    onChange(arr.length > 0 ? arr : [...DEFAULT_MODERATOR_PERMISSIONS]);
  }

  return (
    <div
      className={
        compact
          ? "grid gap-2 sm:grid-cols-2"
          : "rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3"
      }
    >
      {!compact && (
        <div>
          <p className="text-sm font-bold text-purple-200">Moderator permissions</p>
          <p className="text-xs text-zinc-500 mt-1">
            Choose what this moderator can access. Admins always have full access.
          </p>
        </div>
      )}
      <div className={compact ? "contents" : "grid gap-2 sm:grid-cols-2"}>
        {MODERATOR_PERMISSIONS.map((perm) => (
          <label
            key={perm.id}
            className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer hover:border-purple-500/30"
          >
            <input
              type="checkbox"
              checked={selected.has(perm.id)}
              onChange={() => toggle(perm.id)}
              className="mt-0.5 accent-[#53fc18]"
            />
            <span className="min-w-0">
              <span className="text-xs font-semibold text-white block">{perm.label}</span>
              {!compact && (
                <span className="text-[10px] text-zinc-500 block mt-0.5">{perm.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {!compact && (
        <button
          type="button"
          onClick={() => onChange([...DEFAULT_MODERATOR_PERMISSIONS])}
          className="text-xs text-zinc-400 underline w-fit"
        >
          Select all
        </button>
      )}
    </div>
  );
}
