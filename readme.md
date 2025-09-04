# Send to Intercom Slack App

Create Intercom support tickets directly from Slack with an interactive modal form.

## What It Does

This Slack app bridges the gap between Slack and Intercom by providing an easy way to create support tickets within Slack threads and channels.

- **Interactive Ticket Creation**: Mention the bot (`@Send to Intercom`) in any channel and click the "Create Ticket" button to open a modal form. Submitting the form creates tickets in Intercom via API.

## How It Works

1. **Mention the Bot**: Type `@Send to Intercom` in any Slack channel
2. **Click Create Ticket**: The bot responds with a "Create Ticket" button
3. **Fill the Form**: A modal opens with fields for:
   - Ticket title
   - Detailed description
   - Customer email address
4. **Submit**: The app creates the ticket in Intercom and posts a confirmation with the ticket ID and direct link

## Technical Details

This custom Slack app was built using the Bolt framework for Node.js

## Slack Permissions Required

- `app_mentions:read`: Listen for bot mentions
- `chat:write`: Post messages and responses
- `users:read`: Access user information