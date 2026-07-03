import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ITINERARY_SCHEMA } from "@/lib/itinerary-schema";
import { chatSystemPrompt } from "@/lib/prompts";
import type { ChatMessage, Itinerary, Traveler, TripRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = "claude-opus-4-8";
const MAX_TOOL_ROUNDS = 5;

const UPDATE_ITINERARY_TOOL: Anthropic.Messages.ToolUnion = {
  name: "update_itinerary",
  description:
    "Replace the trip itinerary shown to the user. Call this whenever the user asks for any change to the plan, or asks you to create a plan. Always pass the COMPLETE itinerary — every day, including unchanged ones — because it fully replaces what the user sees.",
  strict: true,
  input_schema: ITINERARY_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
};

// The response is a stream of newline-delimited JSON events:
//   {type:"text", text}       — assistant text delta
//   {type:"itinerary", itinerary} — the plan was updated, re-render it
//   {type:"error", error}
//   {type:"done"}
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  const { messages, travelers, trip, itinerary } = (await req.json()) as {
    messages: ChatMessage[];
    travelers: Traveler[];
    trip: TripRequest | null;
    itinerary: Itinerary | null;
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  const client = new Anthropic();
  const system = chatSystemPrompt(travelers ?? [], trip ?? null, itinerary ?? null);
  const history: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const msgStream = client.messages.stream({
            model: MODEL,
            max_tokens: 64000,
            thinking: { type: "adaptive" },
            system,
            tools: [UPDATE_ITINERARY_TOOL],
            messages: history,
          });

          msgStream.on("text", (delta) => emit({ type: "text", text: delta }));

          const message = await msgStream.finalMessage();

          if (message.stop_reason === "refusal") {
            emit({ type: "error", error: "The model declined this request." });
            break;
          }

          if (message.stop_reason === "pause_turn") {
            history.push({ role: "assistant", content: message.content });
            continue;
          }

          if (message.stop_reason === "tool_use") {
            const toolUses = message.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
            );
            history.push({ role: "assistant", content: message.content });

            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const toolUse of toolUses) {
              if (toolUse.name === "update_itinerary") {
                emit({ type: "itinerary", itinerary: toolUse.input });
                results.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: "Itinerary updated and now displayed to the user.",
                });
              } else {
                results.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: `Unknown tool: ${toolUse.name}`,
                  is_error: true,
                });
              }
            }
            history.push({ role: "user", content: results });
            continue;
          }

          break; // end_turn or anything else terminal
        }
        emit({ type: "done" });
      } catch (error) {
        const detail =
          error instanceof Anthropic.RateLimitError
            ? "Rate limited by the Claude API. Wait a moment and try again."
            : error instanceof Anthropic.AuthenticationError
              ? "Invalid ANTHROPIC_API_KEY."
              : error instanceof Anthropic.APIError
                ? `Claude API error: ${error.message}`
                : "Unexpected server error.";
        emit({ type: "error", error: detail });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
