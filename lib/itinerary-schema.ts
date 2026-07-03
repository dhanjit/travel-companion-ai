// JSON Schema for the Itinerary shape in lib/types.ts. Used both as the
// structured-output format of /api/plan and as the strict input schema of the
// update_itinerary tool in /api/chat, so the model always produces the exact
// shape the UI renders. Strict mode requires additionalProperties: false and
// every property listed in required.

const STOP_SCHEMA = {
  type: "object",
  properties: {
    time: {
      type: "string",
      description: "Start time in 24h HH:MM local time, e.g. 08:30",
    },
    type: {
      type: "string",
      enum: [
        "drive",
        "meal",
        "sight",
        "break",
        "activity",
        "fuel",
        "checkin",
        "other",
      ],
      description:
        "drive = a driving leg; meal = breakfast/lunch/dinner stop; sight = viewpoint or attraction; break = rest/stretch stop; checkin = arriving at the night's stay",
    },
    title: { type: "string", description: "Short label, e.g. 'Lunch at a highway dhaba'" },
    location: { type: "string", description: "Place name or area" },
    durationMinutes: { type: "integer", description: "Expected duration in minutes" },
    details: {
      type: "string",
      description:
        "1-3 sentences: what to do/eat here and why it suits these specific travelers",
    },
  },
  required: ["time", "type", "title", "location", "durationMinutes", "details"],
  additionalProperties: false,
} as const;

const STAY_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Suggested hotel/stay name or type" },
        location: { type: "string" },
        notes: {
          type: "string",
          description: "Why this stay suits the group; booking hints",
        },
      },
      required: ["name", "location", "notes"],
      additionalProperties: false,
    },
    { type: "null" },
  ],
} as const;

export const ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    tripTitle: { type: "string" },
    overview: {
      type: "string",
      description: "2-4 sentence summary of the trip and route",
    },
    totalDistance: {
      type: "string",
      description: "Approximate total driving distance and time, e.g. '~850 km / 16h driving'",
    },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer", description: "1-based day number" },
          date: { type: "string", description: "ISO date YYYY-MM-DD" },
          title: { type: "string", description: "e.g. 'Mumbai to Pune via Lonavala'" },
          driveSummary: {
            type: "string",
            description: "Driving summary for the day, e.g. '~180 km, ~4h with stops'. Empty string if no driving.",
          },
          stops: { type: "array", items: STOP_SCHEMA },
          stay: STAY_SCHEMA,
        },
        required: ["day", "date", "title", "driveSummary", "stops", "stay"],
        additionalProperties: false,
      },
    },
    tips: {
      type: "array",
      items: { type: "string" },
      description: "Practical tips for this specific trip and group",
    },
  },
  required: ["tripTitle", "overview", "totalDistance", "days", "tips"],
  additionalProperties: false,
} as const;
