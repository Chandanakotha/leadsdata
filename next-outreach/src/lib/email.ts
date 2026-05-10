export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; error?: string }> {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    return { success: false, error: "BREVO_API_KEY is not set" };
  }

  const fromAddress = params.from ?? process.env.BREVO_FROM_EMAIL ?? "noreply@yourdomain.com";
  const fromName = process.env.BREVO_FROM_NAME ?? "Outreach";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromAddress,
        },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error({ result, to: params.to }, "Brevo API returned error");
      return { success: false, error: result.message || "Failed to send via Brevo" };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error({ err, to: params.to }, "Failed to send email via Brevo");
    return { success: false, error: message };
  }
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
