import type Groq from 'groq-sdk'
import * as g from '@/lib/google/api'

export const GOOGLE_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_calendar_events',
      description: "List the user's upcoming Google Calendar events.",
      parameters: {
        type: 'object',
        properties: {
          timeMin: { type: 'string', description: 'ISO 8601 start time. Defaults to now.' },
          timeMax: { type: 'string', description: 'ISO 8601 end time (optional).' },
          maxResults: { type: 'number', description: 'Max events to return (default 10).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description:
        "Prepare a calendar event for the user to review and confirm. This does NOT create the event — it shows the user a card with an Add button they must click. Use for scheduling and reminders.",
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Event title.' },
          start: { type: 'string', description: 'ISO 8601 start datetime, e.g. 2026-05-30T18:00:00.' },
          end: { type: 'string', description: 'ISO 8601 end datetime. If unsure, use 30-60 min after start.' },
          description: { type: 'string', description: 'Optional details.' },
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_emails',
      description: "List recent Gmail messages. Supports a Gmail search query like 'is:unread' or 'newer_than:5d'.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: "Gmail search query, e.g. 'is:unread' or 'from:mom'." },
          maxResults: { type: 'number', description: 'Max messages to return (default 5).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compose_email',
      description:
        'Prepare an email for the user to review and send. This does NOT send the email — it shows the user a draft with a Send button that they must click. Use this whenever the user asks to send/email someone.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address.' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Plain text email body.' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
]

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  accessToken: string
): Promise<unknown> {
  try {
    switch (name) {
      case 'list_calendar_events':
        return await g.listCalendarEvents(accessToken, args as g.ListEventsArgs)
      case 'create_calendar_event':
        // Does NOT create the event. The route surfaces this to the UI as a confirm
        // card; the user must click Add (handled by /api/google/calendar).
        return {
          status: 'prepared_for_review',
          note: 'The event is shown to the user with an Add button. It has NOT been created. Tell them to review and confirm it; never claim it was already added.',
          summary: args.summary,
          start: args.start,
          end: args.end,
        }
      case 'list_emails':
        return await g.listEmails(accessToken, args as g.ListEmailsArgs)
      case 'compose_email':
        // Intentionally does NOT send. The route surfaces this to the UI as a
        // draft card; the user must click Send to actually deliver it.
        return {
          status: 'prepared_for_review',
          note: 'The email draft is now shown to the user with a Send button. It has NOT been sent. Tell the user to review and send it — do not claim it was sent.',
          to: args.to,
          subject: args.subject,
        }
      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed' }
  }
}
