
/**
 * GNEW · N355 — Notification Service
 * Objetivo: Servicio centralizado para enviar notificaciones (email y en el futuro push).
 */

import nodemailer from "nodemailer";

export interface NotificationPayload {
  to: string;
  subject: string;
  message: string;
}

export class NotificationService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "user",
        pass: process.env.SMTP_PASS || "pass",
      },
    });
  }

  async sendEmail(payload: NotificationPayload): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@gnew.org",
      to: payload.to,
      subject: payload.subject,
      text: payload.message,
    });
  }
}

export const notificationService = new NotificationService();


