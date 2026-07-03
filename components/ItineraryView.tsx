"use client";

import type { Itinerary, StopType } from "@/lib/types";

const STOP_ICONS: Record<StopType, string> = {
  drive: "🚗",
  meal: "🍽️",
  sight: "🏞️",
  break: "☕",
  activity: "🎯",
  fuel: "⛽",
  checkin: "🏨",
  other: "📍",
};

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export default function ItineraryView({ itinerary }: { itinerary: Itinerary | null }) {
  if (!itinerary) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/50 p-8 text-center">
        <div className="mb-2 text-4xl">🗺️</div>
        <p className="max-w-sm text-stone-500">
          No itinerary yet. Add your travelers, fill in the trip, and hit{" "}
          <span className="font-medium text-stone-700">Plan my trip</span> — or just
          ask the companion in the chat.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">{itinerary.tripTitle}</h1>
        <p className="mt-1 text-sm text-stone-600">{itinerary.overview}</p>
        {itinerary.totalDistance && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            🚗 {itinerary.totalDistance}
          </p>
        )}
      </header>

      {itinerary.days.map((day) => (
        <section
          key={day.day}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              <span className="mr-2 rounded-lg bg-amber-100 px-2 py-0.5 text-sm text-amber-800">
                Day {day.day}
              </span>
              {day.title}
            </h2>
            <span className="text-xs text-stone-400">{day.date}</span>
          </div>
          {day.driveSummary && (
            <p className="mb-3 text-sm text-stone-500">🛣️ {day.driveSummary}</p>
          )}

          <ol className="space-y-0">
            {day.stops.map((stop, i) => (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < day.stops.length - 1 && (
                  <span className="absolute left-[13px] top-7 h-full w-px bg-stone-200" />
                )}
                <span className="z-10 mt-0.5 text-lg leading-none">
                  {STOP_ICONS[stop.type] ?? "📍"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-xs text-stone-400">{stop.time}</span>
                    <span className="text-sm font-medium">{stop.title}</span>
                    {formatDuration(stop.durationMinutes) && (
                      <span className="text-xs text-stone-400">
                        · {formatDuration(stop.durationMinutes)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">{stop.location}</p>
                  {stop.details && (
                    <p className="mt-0.5 text-sm text-stone-600">{stop.details}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {day.stay && (
            <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm">
              <span className="font-medium">🛏️ Stay: {day.stay.name}</span>
              <span className="text-stone-500"> — {day.stay.location}</span>
              {day.stay.notes && (
                <p className="mt-0.5 text-stone-600">{day.stay.notes}</p>
              )}
            </div>
          )}
        </section>
      ))}

      {itinerary.tips.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">💡 Tips for this trip</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
            {itinerary.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
