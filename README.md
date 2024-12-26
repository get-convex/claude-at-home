# "We have Claude at home"

A chatbot with GPT-4o and Convex. The chat bot supports rich text, memory
with OpenAI's embeddings and Convex's vector search, and tool use.

## Setup

First, install dependencies and start a new Convex project.

```
bun install
bun convex dev --once
```

Set your OpenAI API key.

```
bunx convex env set OPENAI_API_KEY <your-key>
```

Next, we need to set up auth with Clerk. First, create a new Clerk
project, and only enable Google sign-in. This is a bit finicky: I 
ended up needing to create _two_ Clerk projects, one for dev and one
for prod. This is because adding a production deployment for a Clerk
project requires a domain. But, for now, just create a single project.

Follow the instructions in https://docs.convex.dev/auth/clerk, creating
a JWT template, and setting the Issuer URL as an environment variable.

```
bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-dev-clerk-domain>.clerk.accounts.dev
```

Get the Clerk publishable key from "API Keys" and set it in your `.env.local` file

```
VITE_CLERK_PUBLISHABLE_KEY=<your-key>
```

Then, we need to following the instructions in https://github.com/thomasballinger/convex-clerk-users-table to connect the Clerk webhook to the Convex deployment.

In the Clerk dashboard, go to "Configure" and then "Webhooks", and create a
new webhook to `https://<your-convex-deployment>.convex.site/clerk-users-webhook`.
Leave all the default settings and click "Create".

Grab the "Signing Secret" from the newly created webhook, and set it as the `CLERK_WEBHOOK_SECRET`
environment variable in Convex.

Deploy to Convex again.

```
bun run dev
```

This app only allows users with a pre-approved email address. Go to the
Convex dashboard and insert a row into `allowedEmails` with your Google
account's email address.

Finally, let's try it end-to-end! Go to `localhost:5173`, log in and start chatting.

## Coming soon

- Running code tool use (pyodide, webcontainers)
- Web search tool use (https://tavily.com/)
- Encryption at rest (lock account with a password, derive private/public key, send public key to server to encrypt)
- Collaborative chats
- Debug viewer and multiple personas
