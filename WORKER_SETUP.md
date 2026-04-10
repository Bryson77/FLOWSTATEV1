# Flow State Email Worker Setup

This worker handles contact form submissions and scheduled weekly summary emails using **Resend**.

## Prerequisites

1.  A **Resend** account and API key.
2.  A **Cloudflare** account.
3.  **Wrangler** installed locally (`npm install -g wrangler`).

## Deployment Instructions

1.  **Initialize the worker**:
    If you haven't already, move into the `worker` directory:
    ```bash
    cd worker
    ```

2.  **Add your secrets**:
    Run these commands to add your API keys securely to Cloudflare:
    ```bash
    npx wrangler secret put RESEND_API_KEY
    npx wrangler secret put SUPABASE_URL
    npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
    ```

3.  **Configure your domain**:
    In `src/index.js`, update the `from` email address once you have verified your domain in Resend.
    ```javascript
    from: 'Flow State <hello@yourdomain.com>',
    ```

4.  **Deploy**:
    ```bash
    npx wrangler deploy
    ```

## Email Templates

The templates are located in the `email-templates/` directory of the root project.
- `contact-template.html`: Professional notification for new messages.
- `weekly-summary.html`: Beautiful productivity report for your users.

> [!TIP]
> To test the formatting locally before deploying, you can use the `npx wrangler dev` command and send a `POST` request to `http://localhost:8787` using Postman or cURL.
