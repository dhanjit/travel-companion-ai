"use client";

import type { Traveler } from "@/lib/types";

const FIELDS: { key: keyof Omit<Traveler, "id">; label: string; placeholder: string }[] = [
  { key: "age", label: "Age", placeholder: "34" },
  { key: "role", label: "Role", placeholder: "driver / kid / grandma" },
  { key: "dietary", label: "Dietary", placeholder: "vegetarian, no peanuts" },
  { key: "interests", label: "Interests", placeholder: "history, hiking, street food" },
  { key: "notes", label: "Notes", placeholder: "gets carsick, needs breaks every 2h" },
];

export default function TravelersPanel({
  travelers,
  onChange,
}: {
  travelers: Traveler[];
  onChange: (travelers: Traveler[]) => void;
}) {
  const update = (id: string, patch: Partial<Traveler>) =>
    onChange(travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const add = () =>
    onChange([
      ...travelers,
      {
        id: crypto.randomUUID(),
        name: "",
        age: "",
        role: "",
        dietary: "",
        interests: "",
        notes: "",
      },
    ]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Travelers
        </h2>
        <button
          onClick={add}
          className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
        >
          + Add
        </button>
      </div>

      {travelers.length === 0 && (
        <p className="text-sm text-stone-500">
          Add the people going on the trip. The AI plans around who they are —
          diets, interests, ages, quirks.
        </p>
      )}

      <div className="space-y-3">
        {travelers.map((t) => (
          <div key={t.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
                placeholder="Name"
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-medium"
              />
              <button
                onClick={() => onChange(travelers.filter((x) => x.id !== t.id))}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                title="Remove traveler"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((f) => (
                <label
                  key={f.key}
                  className={f.key === "notes" || f.key === "interests" ? "col-span-2" : ""}
                >
                  <span className="text-[11px] font-medium uppercase text-stone-400">
                    {f.label}
                  </span>
                  <input
                    value={t[f.key]}
                    onChange={(e) => update(t.id, { [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
