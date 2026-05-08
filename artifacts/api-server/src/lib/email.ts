import { Resend } from "resend";
import { logger } from "./logger";

const resendApiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(resendApiKey);
  }
  return resend;
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = variables[key];
    return val != null ? val : `{{${key}}}`;
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; error?: string }> {
  const fromAddress = params.from ?? process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";

  try {
    const client = getResend();
    const result = await client.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      logger.warn({ error: result.error, to: params.to }, "Resend returned error");
      return { success: false, error: result.error.message };
    }

    logger.info({ to: params.to, id: result.data?.id }, "Email sent successfully");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: params.to }, "Failed to send email");
    return { success: false, error: message };
  }
}
