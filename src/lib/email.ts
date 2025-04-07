import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  html,
  from = 'Property Management <noreply@yourdomain.com>'
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending email:', error);
    return { success: false, error };
  }
};
