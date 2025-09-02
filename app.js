require('dotenv').config();

const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize the Bolt app
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000,
});

// Reusable function to create support ticket in Intercom
async function createSupportTicket(ticketData, logger) {
    const { title, description, customer_email, ticket_type = 'support' } = ticketData;

    // Validate required fields
    if (!title || !description || !customer_email) {
        throw new Error('Missing required fields: title, description, and customer_email are required');
    }

    // Prepare Intercom API payload
    const intercomPayload = {
        ticket_type_id: process.env.INTERCOM_TICKET_TYPE_ID || 'default',
        contacts: [{
            email: customer_email
        }],
        ticket_parts: [{
            part_type: 'note',
            body: description
        }],
        ticket_attributes: {
            subject: title,
            _default_title_: title
        }
    };

    // Make API call to Intercom
    const response = await axios.post('https://api.intercom.io/tickets', intercomPayload, {
        headers: {
            'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Intercom-Version': '2.10'
        },
        timeout: 10000
    });

    // Extract response data
    const ticket = response.data;
    const ticketId = ticket.id;
    const ticketUrl = `https://app.intercom.com/a/apps/${process.env.INTERCOM_APP_ID}/inbox/conversation/${ticket.id}`;

    logger.info(`Successfully created ticket ${ticketId} for ${customer_email}`);

    return {
        ticket_id: ticketId.toString(),
        ticket_url: ticketUrl,
        status: 'success'
    };
}

// Modal view definition for ticket creation form
const ticketModalView = {
    type: 'modal',
    callback_id: 'ticket_modal',
    title: {
        type: 'plain_text',
        text: 'Create Support Ticket'
    },
    submit: {
        type: 'plain_text',
        text: 'Create Ticket'
    },
    close: {
        type: 'plain_text',
        text: 'Cancel'
    },
    blocks: [
        {
            type: 'input',
            block_id: 'title_block',
            element: {
                type: 'plain_text_input',
                action_id: 'title_input',
                placeholder: {
                    type: 'plain_text',
                    text: 'Enter ticket title'
                }
            },
            label: {
                type: 'plain_text',
                text: 'Title'
            }
        },
        {
            type: 'input',
            block_id: 'description_block',
            element: {
                type: 'plain_text_input',
                action_id: 'description_input',
                multiline: true,
                placeholder: {
                    type: 'plain_text',
                    text: 'Describe the issue or request'
                }
            },
            label: {
                type: 'plain_text',
                text: 'Description'
            }
        },
        {
            type: 'input',
            block_id: 'email_block',
            element: {
                type: 'plain_text_input',
                action_id: 'email_input',
                placeholder: {
                    type: 'plain_text',
                    text: 'customer@example.com'
                }
            },
            label: {
                type: 'plain_text',
                text: 'Customer Email'
            }
        },
        {
            type: 'input',
            block_id: 'ticket_type_block',
            element: {
                type: 'static_select',
                action_id: 'ticket_type_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select ticket type'
                },
                initial_option: {
                    text: {
                        type: 'plain_text',
                        text: 'Support'
                    },
                    value: 'support'
                },
                options: [
                    {
                        text: {
                            type: 'plain_text',
                            text: 'Support'
                        },
                        value: 'support'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: 'Bug Report'
                        },
                        value: 'bug'
                    },
                    {
                        text: {
                            type: 'plain_text',
                            text: 'Feature Request'
                        },
                        value: 'feature'
                    }
                ]
            },
            label: {
                type: 'plain_text',
                text: 'Ticket Type'
            },
            optional: true
        }
    ]
};

// Handle app mentions to open ticket creation modal
app.event('app_mention', async ({ event, client, logger }) => {
    try {
        logger.info('App mentioned in channel:', event.channel);

        // Store the original message context for later use
        const modalView = {
            ...ticketModalView,
            private_metadata: JSON.stringify({
                channel: event.channel,
                thread_ts: event.thread_ts || event.ts,
                user: event.user
            })
        };

        // Open the modal
        await client.views.open({
            trigger_id: event.trigger_id,
            view: modalView
        });

    } catch (error) {
        logger.error('Error handling app mention:', error);
    }
});

// Handle modal form submission
app.view('ticket_modal', async ({ ack, body, view, client, logger }) => {
    try {
        // Acknowledge the modal submission
        await ack();

        // Extract form values
        const values = view.state.values;
        const title = values.title_block.title_input.value;
        const description = values.description_block.description_input.value;
        const customer_email = values.email_block.email_input.value;
        const ticket_type = values.ticket_type_block.ticket_type_select.selected_option?.value || 'support';

        // Get original context from private metadata
        const metadata = JSON.parse(view.private_metadata);
        const { channel, thread_ts, user } = metadata;

        // Create the support ticket
        const result = await createSupportTicket({
            title,
            description,
            customer_email,
            ticket_type
        }, logger);

        // Post success message in the original thread/channel
        await client.chat.postMessage({
            channel: channel,
            thread_ts: thread_ts,
            text: `🎫 Support ticket created successfully!\n\n*Ticket ID:* ${result.ticket_id}\n*Customer:* ${customer_email}\n*Title:* ${title}\n\n<${result.ticket_url}|View ticket in Intercom>`
        });

    } catch (error) {
        logger.error('Error creating support ticket from modal:', error);

        // Get context for error message
        const metadata = JSON.parse(view.private_metadata);
        const { channel, thread_ts } = metadata;

        // Handle different types of errors
        let errorMessage = 'Unknown error occurred';

        if (error.response) {
            errorMessage = `Intercom API error: ${error.response.status} - ${error.response.data?.message || 'Unknown API error'}`;
        } else if (error.request) {
            errorMessage = 'Network error: Could not reach Intercom API';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }

        // Post error message in the original thread/channel
        await client.chat.postMessage({
            channel: channel,
            thread_ts: thread_ts,
            text: `❌ Failed to create support ticket: ${errorMessage}`
        });
    }
});

// Legacy workflow function (kept for backward compatibility)
app.function('create_support_ticket', async ({ complete, fail, inputs, client, logger }) => {
    try {
        logger.info('Creating support ticket with inputs:', inputs);

        const result = await createSupportTicket(inputs, logger);

        await complete({
            outputs: result
        });

    } catch (error) {
        logger.error('Error creating support ticket:', error);

        let errorMessage = 'Unknown error occurred';

        if (error.response) {
            errorMessage = `Intercom API error: ${error.response.status} - ${error.response.data?.message || 'Unknown API error'}`;
        } else if (error.request) {
            errorMessage = 'Network error: Could not reach Intercom API';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }

        await fail({
            error: errorMessage
        });
    }
});

// Start the app
(async () => {
    try {
        await app.start();
        console.log('⚡️ Send to Intercom app is running!');
    } catch (error) {
        console.error('Failed to start app:', error);
        process.exit(1);
    }
})();