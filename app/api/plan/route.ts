import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ITINERARY_SCHEMA } from "@/lib/itinerary-schema";
import { plannerSystemPrompt, tripBrief } from "@/lib/prompts";
import type { Traveler, TripRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = "claude-opus-4-8";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Local dev: add it to .env.local. Cloudflare: add it as a secret under the Worker's Settings → Variables and Secrets." },
      { status: 500 },
    );
  }

  const { travelers, trip } = (await req.json()) as {
    travelers: Traveler[];
    trip: TripRequest;
  };

  if (!trip?.origin || !trip?.destination || !trip?.startDate || !trip?.endDate) {
    return NextResponse.json(
      { error: "Origin, destination and dates are required." },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: plannerSystemPrompt(travelers ?? []),
      output_config: {
        format: { type: "json_schema", schema: ITINERARY_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Plan this road trip:\n${tripBrief(trip)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined to plan this trip. Try rephrasing the request." },
        { status: 422 },
      );
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "The itinerary was too long to generate in one pass. Try fewer days or a shorter route." },
        { status: 422 },
      );
    }

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) {
      return NextResponse.json(
        { error: "The model returned no itinerary." },
        { status: 502 },
      );
    }

    return NextResponse.json({ itinerary: JSON.parse(text) });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY." },
        { status: 500 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by the Claude API. Wait a moment and try again." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: 502 },
      );
    }
    throw error;
  }
}
