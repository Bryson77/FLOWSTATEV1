import { Resend } from 'resend';

// CONTACT TEMPLATE
const contactTemplate = (name, email, subject, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #000000; font-family: sans-serif; color: #ffffff; }
    .wrapper { width: 100%; background-color: #000000; padding-bottom: 40px; }
    .main { background-color: #161616; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; }
    .header { padding: 40px 30px 20px; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: #ffffff; text-decoration: none; }
    .content { padding: 20px 30px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #ffffff; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-top: 20px; margin-bottom: 4px; }
    .value { font-size: 15px; line-height: 1.6; color: #a1a1aa; }
    .message-box { background-color: #0e0e0e; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-top: 20px; }
    .footer { padding: 30px; text-align: center; font-size: 12px; color: #4a4a4a; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 700; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table align="center" style="background-color: #161616; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
      <tr><td style="padding: 40px 30px 20px; text-align: center;"><div style="font-size: 24px; font-weight: 800; color: #ffffff;">Flow State</div></td></tr>
      <tr><td style="padding: 20px 30px;">
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #ffffff;">New Contact Form Message</div>
        <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa;">You have received a new message from the Flow State website.</p>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-top: 20px; margin-bottom: 4px;">From</div>
        <div style="font-size: 15px; line-height: 1.6; color: #a1a1aa;">${name} (${email})</div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-top: 20px; margin-bottom: 4px;">Subject</div>
        <div style="font-size: 15px; line-height: 1.6; color: #a1a1aa;">${subject}</div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-top: 20px; margin-bottom: 4px;">Message</div>
        <div style="background-color: #0e0e0e; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-top: 20px;">
          <div style="font-size: 15px; line-height: 1.6; color: #a1a1aa;">${message}</div>
        </div>
        <center><a href="mailto:${email}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 700; margin-top: 30px;">Reply to User</a></center>
      </td></tr>
      <tr><td style="padding: 30px; text-align: center; font-size: 12px; color: #4a4a4a;">&copy; 2026 Flow State Productivity. All rights reserved.</td></tr>
    </table>
  </div>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { name, email, subject, message } = await request.json();
      const resend = new Resend(env.RESEND_API_KEY);

      const data = await resend.emails.send({
        from: 'Flow State <onboarding@resend.dev>', // Update with your verified domain
        to: ['lethabomabilo53@gmail.com'], // Update with your email
        subject: `[Flow State] New Message: ${subject}`,
        html: contactTemplate(name, email, subject, message),
      });

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  // Scheduled handler for weekly emails
  async scheduled(event, env, ctx) {
    // Logic for weekly summary goes here
    console.log('Running weekly email job...');
  }
};
