# Signal — ClickUp AI Ticket Triage

Signal is a Next.js dashboard and webhook service that classifies new ClickUp tasks with Google Gemini, then writes the predicted client and product into ClickUp custom fields. The dashboard includes service status, an interactive classification playground, webhook setup, and a recent webhook view.

## Architecture

The project uses the Next.js App Router with strict TypeScript, Tailwind CSS 4, Framer Motion, Lucide icons, and Google's official `@google/genai` SDK.

```text
src/
  app/                    App Router pages, styling, and API handlers
    api/classify/          Playground classification endpoint
    api/fields/            List custom fields for a ClickUp List
    api/health/            Server-side credential presence checks
    api/setup-webhook/     List or register ClickUp webhooks
    api/webhook/           Verify and process ClickUp events
  components/              Dashboard and reusable animated UI
    ui/Modal.tsx           Accessible animated dialog
    ui/Toast.tsx           Reusable animated notifications
  services/                ClickUp API and Gemini integration
  types/                   ClickUp payload and API types
```

The webhook handler verifies ClickUp's `X-Signature` HMAC-SHA256 header against `CLICKUP_WEBHOOK_SECRET`, accepts `taskCreated` events and `taskUpdated` events that change the task title or description, fetches the full task, classifies its title and description, and updates configured custom fields. This also handles integrations that create a task first and populate its description in a later update. Custom-field updates are ignored by the text-change filter to prevent reclassification loops. The Gemini response is constrained to JSON with `client`, `product`, and `confidence` properties. Missing classifications are left untouched. The overview chart and summary counters currently show labeled sample metrics; live event history and durable analytics storage are not part of this starter.

## Instalação na sua máquina (Windows)

Este guia configura a aplicação local para receber tickets do HubSpot através do ClickUp. O painel de classificação manual é apenas um teste; quem faz a automação é o webhook do ClickUp.

### 1. Preparar o projeto

Instale Node.js 20.9 ou mais recente e Git. No PowerShell:

```powershell
git clone https://github.com/nicholas-sc-08/clickup-ai-auto-tagger.git
cd clickup-ai-auto-tagger
npm install
Copy-Item .env.example .env.local
```

Se o projeto já estiver clonado, entre na pasta existente e rode `npm install`. Não sobrescreva um `.env.local` que já contenha suas chaves.

### 2. Configurar as credenciais

Abra `.env.local` e preencha:

| Variável | Onde obter |
| --- | --- |
| `CLICKUP_API_TOKEN` | Token pessoal de API do ClickUp |
| `GEMINI_API_KEY` | Chave criada no Google AI Studio |
| `CLICKUP_TEAM_ID` | ID do workspace do ClickUp |
| `CLICKUP_PRODUCT_FIELD_ID` | ID do campo PRODUTO; consulte o cartão **Custom Fields Lookup** usando a lista `900700253157` |
| `CLICKUP_CLIENT_FIELD_ID` | ID do campo CLIENTES da mesma lista |
| `CLICKUP_WEBHOOK_SECRET` | Segredo mostrado pelo ClickUp ao registrar o webhook |
| `NEXT_PUBLIC_APP_URL` | Deixe `http://localhost:3001` para abrir o painel local; ao registrar o webhook, informe a URL pública do túnel |

Nunca publique `.env.local` nem envie as chaves ao GitHub. O `.gitignore` já ignora `.env.local` e o executável local `cloudflared.exe`.

### 3. Iniciar o servidor

Em uma janela do PowerShell, dentro da pasta do projeto:

```powershell
npm run dev -- --port 3001
```

Deixe essa janela aberta. O painel ficará em [http://localhost:3001](http://localhost:3001).

### 4. Abrir um túnel HTTPS sem instalar como administrador

Baixe o executável portátil oficial do Cloudflare para Windows 64-bit:

```powershell
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile ".\cloudflared.exe"
```

Em uma segunda janela do PowerShell, na pasta do projeto, inicie o túnel:

```powershell
.\cloudflared.exe tunnel --url http://localhost:3001
```

Mantenha essa janela aberta. Copie o endereço `https://....trycloudflare.com` mostrado no terminal; ele muda quando o túnel é reiniciado.

### 5. Registrar o webhook do ClickUp

No painel local, escolha **Add webhook** e informe:

1. O ID do workspace do ClickUp.
2. A URL pública atual seguida de `/api/webhook`, por exemplo `https://seu-endereco.trycloudflare.com/api/webhook`.
3. Clique em **Register webhook** e copie o segredo exibido.
4. Cole o segredo em `CLICKUP_WEBHOOK_SECRET` no `.env.local` e reinicie somente o servidor Next.js com `Ctrl+C` e `npm run dev -- --port 3001`. Deixe o túnel aberto.

O webhook deve escutar `taskCreated` e `taskUpdated`. Se o endereço do túnel mudar, atualize o endpoint do webhook para o novo endereço.

### 6. Testar a automação HubSpot → ClickUp

Crie um ticket novo no HubSpot e aguarde alguns segundos. O HubSpot cria a task no ClickUp; o ClickUp envia o webhook; o servidor analisa o título e a descrição e grava as opções selecionadas nos campos PRODUTO e CLIENTES. O texto inteiro da descrição não é copiado para esses campos: ele serve como contexto para escolher as opções existentes.

Para tickets sobre conta, login, senha, credenciais, autenticação ou perfil, a regra fixa seleciona a opção de produto **MYACC**. Os demais produtos e o cliente são classificados usando as opções disponíveis no ClickUp. O campo PRODUTO precisa conter a opção `MYACC`.

O botão **Classify ticket** no painel apenas testa uma classificação e mostra o resultado; ele não grava os campos de uma task. Para testar a gravação automática, crie o ticket pelo HubSpot e confira a task correspondente no ClickUp.

### 7. Parar ou iniciar novamente

Pressione `Ctrl+C` na janela do servidor e na janela do túnel para pará-los. Para iniciar novamente, execute os comandos das etapas 3 e 4. Se o Cloudflare fornecer outro endereço, atualize o webhook na etapa 5. Quick Tunnels são para testes e não têm garantia de disponibilidade; para uso contínuo, publique em um host com URL fixa.

### Commit da alteração

Para salvar e enviar a versão atual deste projeto ao GitHub:

```powershell
git add -A
git commit -m "feat: classify account login tickets as MYACC"
git push -u origin feat/project-setup
```

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

### Receive ClickUp webhooks with Cloudflare Quick Tunnels

1. Start the development server with `npm run dev -- --port 3001`.
2. Download the portable Windows executable from the [official Cloudflare downloads page](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/).
3. In another terminal, run `.\cloudflared.exe tunnel --url http://localhost:3001`. Cloudflare Quick Tunnels do not require an account or domain; keep the process running while testing.
4. Copy the `https://....trycloudflare.com` address it prints and use `<address>/api/webhook` in **Configure webhook**.
5. Copy the signing secret returned by ClickUp into `CLICKUP_WEBHOOK_SECRET` and restart the server if it changed.
6. Create a task from HubSpot. ClickUp sends `taskCreated` and, when text fields are populated after creation, `taskUpdated` to the webhook.

LocalTunnel can return an interstitial or a tunnel-unavailable response to webhook POST requests. Use a tunnel that forwards POSTs directly, such as Cloudflare Quick Tunnels.

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
