export interface Traveler {
  id: string;
  name: string;
  age: string;
  role: string;
  dietary: string;
  interests: string;
  notes: string;
}

export interface TripRequest {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  roundTrip: boolean;
  pace: "relaxed" | "balanced" | "packed";
  budget: string;
  notes: string;
}

export type StopType =
  | "drive"
  | "meal"
  | "sight"
  | "break"
  | "activity"
  | "fuel"
  | "checkin"
  | "other";

export interface ItineraryStop {
  time: string;
  type: StopType;
  title: string;
  location: string;
  durationMinutes: number;
  details: string;
}

export interface Stay {
  name: string;
  location: string;
  notes: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  driveSummary: string;
  stops: ItineraryStop[];
  stay: Stay | null;
}

export interface Itinerary {
  tripTitle: string;
  overview: string;
  totalDistance: string;
  days: ItineraryDay[];
  tips: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
