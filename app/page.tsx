"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import ItineraryView from "@/components/ItineraryView";
import TravelersPanel from "@/components/TravelersPanel";
import TripForm from "@/components/TripForm";
import type { ChatMessage, Itinerary, Traveler, TripRequest } from "@/lib/types";

const STORAGE_KEY = "travel-companion-ai-v1";

const EMPTY_TRIP: TripRequest = {
  origin: "",
  destination: "",
  startDate: "",
  endDate: "",
  roundTrip: false,
  pace: "balanced",
  budget: "",
  notes: "",
};

interface PersistedState {
  travelers: Traveler[];
  trip: TripRequest;
  itinerary: Itinerary | null;
  messages: ChatMessage[];
}

export default function Home() {
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [trip, setTrip] = useState<TripRequest>(EMPTY_TRIP);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as PersistedState;
        setTravelers(s.travelers ?? []);
        setTrip({ ...EMPTY_TRIP, ...s.trip });
        setItinerary(s.itinerary ?? null);
        setMessages(s.messages ?? []);
      }
    } catch {
      // corrupted state — start fresh
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ travelers, trip, itinerary, messages } satisfies PersistedState),
    );
  }, [travelers, trip, itinerary, messages]);

  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelers, trip }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setItinerary(data.itinerary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate the plan.");
    } finally {
      setGenerating(false);
    }
  };

  const sendChat = async (text: string) => {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setStreaming(true);
    setError(null);

    const appendAssistant = (delta: string) =>
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: last.content + delta };
        return copy;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, travelers, trip, itinerary }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "text") appendAssistant(event.text);
          else if (event.type === "itinerary") setItinerary(event.itinerary);
          else if (event.type === "error") setError(event.error);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat request failed.");
    } finally {
      setStreaming(false);
      // drop a trailing empty assistant bubble if nothing came back
      setMessages((prev) =>
        prev.length && prev[prev.length - 1].role === "assistant" && !prev[prev.length - 1].content
          ? prev.slice(0, -1)
          : prev,
      );
    }
  };

  const resetAll = () => {
    if (!confirm("Clear travelers, trip, itinerary and chat?")) return;
    setTravelers([]);
    setTrip(EMPTY_TRIP);
    setItinerary(null);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            🧭 Travel Companion <span className="text-amber-600">AI</span>
          </h1>
          <p className="text-xs text-stone-500">
            Knows your travelers · plans the drive · adjusts on the fly
          </p>
        </div>
        <button
          onClick={resetAll}
          className="rounded-lg border border-stone-300 px-3 py-1 text-xs text-stone-500 hover:bg-stone-100"
        >
          Reset
        </button>
      </header>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <TravelersPanel travelers={travelers} onChange={setTravelers} />
          <TripForm
            trip={trip}
            onChange={setTrip}
            onGenerate={generatePlan}
            generating={generating}
          />
        </div>

        <main className="min-w-0">
          {generating ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-sm text-stone-500">
                Planning the route, stops, meals and stays for your group…
              </p>
            </div>
          ) : (
            <ItineraryView itinerary={itinerary} />
          )}
        </main>

        <div className="min-h-[420px] lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
          <ChatPanel messages={messages} streaming={streaming} onSend={sendChat} />
        </div>
      </div>
    </div>
  );
}
