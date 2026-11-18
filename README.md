# Signal — ClickUp AI Ticket Triage

Signal is a Next.js dashboard and webhook service that classifies new ClickUp tasks with Google Gemini, then writes the predicted client and product into ClickUp custom fields. The dashboard includes service status, an interactive classification playground, webhook setup, and a recent webhook view.

## Architecture

The project uses the Next.js App Router with strict TypeScript, Tailwind CSS 4, Framer Motion, Lucide icons, and Google's official `@google/genai` SDK.

```text
src/
  app/                    App Router pages, styling, and API handlers
    api/classify/          Playground classification endpoint
    api/health/            Server-side credential presence checks
    api/setup-webhook/     List or register ClickUp webhooks
    api/webhook/           Verify and process ClickUp events
  components/              Dashboard and reusable animated UI
    ui/Modal.tsx           Accessible animated dialog
    ui/Toast.tsx           Reusable animated notifications
  services/                ClickUp API and Gemini integration
  types/                   ClickUp payload and API types
```

The webhook handler verifies ClickUp's `X-Signature` HMAC-SHA256 header against `CLICKUP_WEBHOOK_SECRET`, accepts `taskCreated` events, fetches the full task, classifies its title and description, and updates configured custom fields. The Gemini response is constrained to JSON with `client`, `product`, and `confidence` properties. Missing classifications are left untouched. The overview chart and summary counters currently show labeled sample metrics; live event history and durable analytics storage are not part of this starter.

## Requirements

- Node.js 20.9 or newer
- A ClickUp API token and workspace (team) ID
- A Gemini API key
- A public HTTPS URL for webhook delivery outside local development

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
| --- | --- |
| `CLICKUP_API_TOKEN` | ClickUp personal API token (`pk_...`) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `CLICKUP_PRODUCT_FIELD_ID` | Custom field ID where the product should be written |
| `CLICKUP_CLIENT_FIELD_ID` | Custom field ID where the client should be written |
| `CLICKUP_WEBHOOK_SECRET` | Signing secret returned by ClickUp when the webhook is created |
| `CLICKUP_TEAM_ID` | ClickUp workspace/team ID used as the default in webhook setup |
| `NEXT_PUBLIC_APP_URL` | Base URL for your deployment, including protocol; used to construct the webhook endpoint |

Keep `.env.local` out of source control. The webhook route expects the ClickUp generated secret in `CLICKUP_WEBHOOK_SECRET`; copy the secret from ClickUp's webhook creation response into your deployment environment, then restart/redeploy the service. If the secret is unset or incorrect, webhook requests are rejected.

Custom field values are sent as strings. Configure the destination fields in ClickUp to accept the labels Gemini returns (or adapt the classifier to map labels to ClickUp option IDs for dropdown fields).

## Run locally

```bash
npm install
cp .env.example .env.local
# Add the ClickUp and Gemini credentials to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard checks whether the server has the ClickUp and Gemini credentials; the playground sends test tickets to `/api/classify`.

### Receive ClickUp webhooks with ngrok

1. Start the development server with `npm run dev`.
2. In another terminal, expose port 3000: `ngrok http 3000`.
3. Copy the HTTPS forwarding URL from ngrok into `NEXT_PUBLIC_APP_URL` (for example, `https://abc123.ngrok-free.app`) and restart Next.js.
4. Open **Configure webhook** in the dashboard, enter your ClickUp workspace/team ID and `https://abc123.ngrok-free.app/api/webhook`, then register it.
5. Copy the signing secret returned by ClickUp into `CLICKUP_WEBHOOK_SECRET` and restart the server.
6. Create a ClickUp task. Inspect the Next.js terminal output and ClickUp custom fields to verify delivery and classification.

The ClickUp token must have permission to read tasks, manage webhooks, and update the selected custom fields. For production, protect the dashboard and setup routes with your application's authentication layer before exposing them to untrusted users.

## Verify and build

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy

Deploy to a Node.js-capable host such as Vercel, Render, or another Next.js platform:

1. Push the repository to your Git provider and import it into your hosting provider.
2. Set all required variables from `.env.example` in the host's server-side environment. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin.
3. Deploy and confirm `/api/health` reports both services as configured.
4. Register a webhook in the dashboard with the production URL (`https://your-domain.example/api/webhook`).
5. Store the ClickUp-generated signing secret as `CLICKUP_WEBHOOK_SECRET`, then redeploy/restart.
6. Create a test task and confirm the product and client custom fields are updated.

Do not prefix API keys or webhook secrets with `NEXT_PUBLIC_`; those values must remain server-side. The webhook endpoint is designed for Node.js runtime because it uses Node's crypto APIs.
