import { ENV } from "../_core/env";
import { logger } from "../security/logger";

type TaskNotification = {
  recipient: string | null | undefined;
  title: string;
  taskId: string;
  kind: "approval" | "completed" | "failed";
  summary: string;
};

function validRecipient(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value);
}

function message(notification: TaskNotification) {
  const subjectPrefix = notification.kind === "approval" ? "Approval needed" : notification.kind === "completed" ? "Task completed" : "Task requires attention";
  return {
    subject: `Synthia AI — ${subjectPrefix}: ${notification.title.slice(0, 120)}`,
    text: `${subjectPrefix}\n\nTask: ${notification.title}\n\n${notification.summary.slice(0, 4_000)}\n\nTask ID: ${notification.taskId}`,
  };
}

async function sendWithResend(to: string, subject: string, text: string) {
  if (!ENV.resendApiKey || !ENV.emailFrom) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.emailFrom, to: [to], subject, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
  return true;
}

async function sendWithPostmark(to: string, subject: string, text: string) {
  if (!ENV.postmarkServerToken || !ENV.emailFrom) return false;
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": ENV.postmarkServerToken, "Content-Type": "application/json" },
    body: JSON.stringify({ From: ENV.emailFrom, To: to, Subject: subject, TextBody: text, MessageStream: ENV.postmarkMessageStream }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Postmark returned ${response.status}.`);
  return true;
}

export async function notifyTask(notification: TaskNotification) {
  if (!validRecipient(notification.recipient)) return false;
  const { subject, text } = message(notification);
  const ordered = ENV.emailPrimary === "postmark" ? [sendWithPostmark, sendWithResend] : [sendWithResend, sendWithPostmark];
  for (const send of ordered) {
    try {
      if (await send(notification.recipient, subject, text)) return true;
    } catch (error) {
      logger.warn({ event: "notification_delivery_failed", taskId: notification.taskId, provider: send.name, error: error instanceof Error ? error.message : "unknown" }, "Task notification delivery failed");
    }
  }
  return false;
}
