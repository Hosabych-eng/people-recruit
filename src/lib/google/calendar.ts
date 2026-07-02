import { google } from "googleapis";
import type { GoogleOAuth2Client } from "@/lib/google/oauth";

const DEFAULT_TIMEZONE = "Europe/Kyiv";

type CreateInterviewCalendarEventInput = {
  auth: GoogleOAuth2Client;
  summary: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  attendeeEmail: string;
  attendeeName: string;
  requestId: string;
};

export type InterviewCalendarEventResult = {
  eventId: string | null;
  meetLink: string | null;
};

export async function createInterviewCalendarEvent(
  input: CreateInterviewCalendarEventInput,
): Promise<InterviewCalendarEventResult> {
  const calendar = google.calendar({ version: "v3", auth: input.auth });
  const endTime = new Date(
    input.scheduledAt.getTime() + input.durationMinutes * 60 * 1000,
  );

  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.scheduledAt.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      attendees: [
        {
          email: input.attendeeEmail,
          displayName: input.attendeeName,
        },
      ],
      conferenceData: {
        createRequest: {
          requestId: input.requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink =
    response.data.hangoutLink ??
    response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri ??
    null;

  return {
    eventId: response.data.id ?? null,
    meetLink,
  };
}
