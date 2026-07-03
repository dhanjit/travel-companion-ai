"use client";

import type { TripRequest } from "@/lib/types";

export default function TripForm({
  trip,
  onChange,
  onGenerate,
  generating,
}: {
  trip: TripRequest;
  onChange: (trip: TripRequest) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const set = (patch: Partial<TripRequest>) => onChange({ ...trip, ...patch });
  const inputCls =
    "w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm";
  const labelCls = "text-[11px] font-medium uppercase text-stone-400";
  const ready = trip.origin && trip.destination && trip.startDate && trip.endDate;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Trip
      </h2>
      <div className="space-y-2">
        <label className="block">
          <span className={labelCls}>From</span>
          <input
            value={trip.origin}
            onChange={(e) => set({ origin: e.target.value })}
            placeholder="Mumbai"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>To</span>
          <input
            value={trip.destination}
            onChange={(e) => set({ destination: e.target.value })}
            placeholder="Goa"
            className={inputCls}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelCls}>Start</span>
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>End</span>
            <input
              type="date"
              value={trip.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelCls}>Pace</span>
            <select
              value={trip.pace}
              onChange={(e) => set({ pace: e.target.value as TripRequest["pace"] })}
              className={inputCls}
            >
              <option value="relaxed">Relaxed</option>
              <option value="balanced">Balanced</option>
              <option value="packed">Packed</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Budget</span>
            <input
              value={trip.budget}
              onChange={(e) => set({ budget: e.target.value })}
              placeholder="mid-range"
              className={inputCls}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 py-1 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={trip.roundTrip}
            onChange={(e) => set({ roundTrip: e.target.checked })}
            className="h-4 w-4 accent-amber-600"
          />
          Round trip (plan the return drive too)
        </label>
        <label className="block">
          <span className={labelCls}>Wishes</span>
          <textarea
            value={trip.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="beach time, avoid night driving, one heritage site…"
            rows={2}
            className={inputCls}
          />
        </label>
        <button
          onClick={onGenerate}
          disabled={!ready || generating}
          className="mt-1 w-full rounded-xl bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? "Planning your trip…" : "Plan my trip"}
        </button>
      </div>
    </section>
  );
}
