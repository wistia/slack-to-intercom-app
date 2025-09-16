# Send to Intercom Slack App

Create Intercom support tickets directly from Slack with an interactive modal form.

## What It Does

This Slack app bridges the gap between Slack and Intercom by providing an easy way to create support tickets within Slack threads and channels, and reporting back with the Ticket URL so the submitter can easily follow along.

## How It Works

1. **Mention the Bot**: Type `@Send to Intercom` in a Slack thread or channel
2. **Click Create Ticket**: The bot responds with a "Create Ticket" button
3. **Fill the Form**: A modal opens with fields for:
   - Ticket title
   - Description
   - Customer email address 
4. **Submit**: The app creates the ticket in Intercom and posts a confirmation with the ticket ID and direct link. **Important:** Intercom will send the customer an email notification when the ticket is created.
5. **Collaborator tagging**: After the ticket is created, it will be updated with a note that @ mentions the person who submitted the ticket. This is helpful for users with collaborator seats who can only read tickets where they've been mentioned.

## Slack App Permissions Required

- `app_mentions:read`: Listen for bot mentions
- `chat:write`: Post messages and responses
- `users:read`: Access user information