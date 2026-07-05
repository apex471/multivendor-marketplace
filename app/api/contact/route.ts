import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotificationEmail } from '@/backend/utils/email';

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

    const { name, email, subject, category, message } = body;
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ success: false, message: 'All required fields must be filled.' }, { status: 400 });
    }

    // Notify admin of support / contact message
    sendAdminNotificationEmail({
      subject: `💬 Support/Contact Inquiry: ${subject}`,
      title: `New Support or Contact Inquiry (${category || 'General'})`,
      message: `A visitor has submitted a new contact or support request: "${message}"`,
      details: {
        'Sender Name': name,
        'Email Address': email,
        'Inquiry Category': category || 'General Support',
        'Subject': subject,
      }
    }).catch(err => console.error('[Contact API] Admin notification email failed:', err));

    console.info('[Contact] New message from', email, '—', subject);

    return NextResponse.json({ success: true, message: 'Message received. We will get back to you within 24 hours.' });
  } catch {
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
