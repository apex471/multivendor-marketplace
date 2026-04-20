import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contact
 * Submit a contact form message.
 * In production this would send an email; for MVP we persist to console log
 * and return a success response so the UI can show confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      email: string;
      subject: string;
      category: string;
      message: string;
    };

    const { name, email, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ success: false, message: 'All required fields must be filled.' }, { status: 400 });
    }

    // TODO: integrate email provider (e.g. Resend / SendGrid) here
    // For now, log and acknowledge
    console.info('[Contact] New message from', email, '—', subject);

    return NextResponse.json({ success: true, message: 'Message received. We will get back to you within 24 hours.' });
  } catch {
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
