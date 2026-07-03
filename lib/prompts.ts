import type { Itinerary, Traveler, TripRequest } from "./types";

export function travelersContext(travelers: Traveler[]): string {
  if (travelers.length === 0) {
    return "No traveler profiles have been saved yet. Plan for a generic small group and note where knowing the travelers would change the plan.";
  }
  const lines = travelers.map((t) => {
    const parts = [
      `- ${t.name || "Unnamed traveler"}`,
      t.age && `age ${t.age}`,
      t.role && `role: ${t.role}`,
      t.dietary && `dietary: ${t.dietary}`,
      t.interests && `interests: ${t.interests}`,
      t.notes && `notes: ${t.notes}`,
    ].filter(Boolean);
    return parts.join("; ");
  });
  return `The travelers (know them well — every choice of stop, meal, pace and stay must fit these specific people):\n${lines.join("\n")}`;
}

export function tripBrief(trip: TripRequest): string {
  return [
    `Origin: ${trip.origin}`,
    `Destination: ${trip.destination}`,
    `Dates: ${trip.startDate} to ${trip.endDate}${trip.roundTrip ? " (round trip — include the return drive)" : " (one way)"}`,
    `Pace: ${trip.pace}`,
    trip.budget && `Budget: ${trip.budget}`,
    trip.notes && `Additional wishes: ${trip.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function plannerSystemPrompt(travelers: Traveler[]): string {
  return `You are a travel companion AI that plans road trips. All travel is by car — never suggest flights or trains.

${travelersContext(travelers)}

Planning rules:
- Build a realistic day-by-day driving itinerary: departure times, driving legs with rough distance/duration, and stops.
- Always schedule meals: breakfast before or shortly after departure, a proper lunch stop, and dinner. Respect every dietary preference listed above.
- Add breaks roughly every 2-3 hours of driving (more often if the notes suggest kids, elderly travelers, or motion sickness).
- End each travel day with an overnight stay suggestion (type of hotel/area, not a hard booking) suited to the group and budget.
- Keep daily driving reasonable: usually under 6-7 hours behind the wheel, less for a relaxed pace.
- Pick sights and activities that match the travelers' interests, not generic top-10 lists.
- Use local knowledge of the region: real road names/highways, real towns for stops, realistic distances and timings.`;
}

export function chatSystemPrompt(
  travelers: Traveler[],
  trip: TripRequest | null,
  itinerary: Itinerary | null,
): string {
  return `You are a travel companion AI riding along on a road trip (all travel is by car). You know the travelers, you know the plan, and you handle whatever they need: adjusting the route, finding food that fits their diets, suggesting stops, solving problems on the road.

${travelersContext(travelers)}

${trip ? `Trip brief:\n${tripBrief(trip)}` : "No trip brief has been set yet."}

${
  itinerary
    ? `Current itinerary (JSON):\n${JSON.stringify(itinerary)}`
    : "No itinerary exists yet. If the user asks you to plan the trip, create one with the update_itinerary tool."
}

Behavior:
- Answer questions conversationally and concretely; keep replies compact.
- Whenever the user asks for any change to the plan (add/skip a stop, change a meal, shift timings, extend a day, different hotel), apply it by calling the update_itinerary tool with the COMPLETE updated itinerary — all days, not just the changed part — then briefly summarize what changed.
- Respect dietary needs and traveler notes in every suggestion.
- Keep the plan realistic for car travel: distances, driving times, breaks.`;
}
