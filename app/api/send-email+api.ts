// app/api/send-email+api.ts (Expo API route)
import { Resend } from 'resend';

export async function POST(request: Request) {
    const { to, subject, html } = await request.json();

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: 'Smart Cleaner Pro <noreply@smartcleanerpro.online>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            return Response.json({ error }, { status: 500 });
        }

        return Response.json({ success: true, data });
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
