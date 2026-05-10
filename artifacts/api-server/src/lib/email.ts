import nodemailer from "nodemailer";
import { logger } from "./logger";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

export function initEmail(): void {
  try {
    getTransporter();
  } catch (err) {
    logger.error({ err }, "Failed to initialize email transporter");
  }
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP environment variables (HOST, USER, PASS) are not set");
    }
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection on startup
    transporter.verify((error, success) => {
      if (error) {
        logger.error({ error }, "SMTP Connection Error");
      } else {
        logger.info("SMTP Connection is ready to send messages");
      }
    });
  }
  return transporter;
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
  const fromAddress = params.from ?? process.env.SMTP_USER ?? "noreply@yourdomain.com";

  try {
    const client = getTransporter();
    await client.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    logger.info({ to: params.to }, "Email sent successfully via SMTP");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: params.to }, "Failed to send email via SMTP");
    return { success: false, error: message };
  }
}
