import nodemailer from "nodemailer";
import { headers } from "next/headers";

// Define fallback host
const DEFAULT_HOST = "csi-appointement.vercel.app";

/**
 * Dynamically resolves the absolute base URL depending on the environment.
 */
async function getBaseUrl() {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    if (host) {
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Run outside Next.js request context (e.g. background scripts)
  }
  return `https://${DEFAULT_HOST}`;
}

interface SendEmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  attachments?: any[];
}

/**
 * Sends an email using Nodemailer (SMTP Relay) with a Brevo REST API fallback.
 */
export async function sendEmail({ to, toName, subject, htmlContent, attachments }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY || "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "klucsi@klu.ac.in";
  const senderName = process.env.BREVO_SENDER_NAME || "CSI KARE";

  const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER || "klucsi@klu.ac.in";
  // The API key is used as the SMTP password in Brevo
  const smtpPass = process.env.SMTP_PASS || apiKey;

  // 1. Try sending via Nodemailer SMTP
  try {
    console.log(`Email Service: Attempting SMTP transfer to ${to}...`);
    const transporter = nodemailer.createTransport({
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

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: `"${toName}" <${to}>`,
      subject: subject,
      html: htmlContent,
      attachments: attachments
    });

    console.log(`Email successfully sent via Nodemailer SMTP to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (smtpError) {
    console.error("Nodemailer SMTP failed. Attempting Brevo HTTP API Fallback...", smtpError);

    // 2. Fallback to Brevo REST API v3
    if (!apiKey) {
      console.error("Missing BREVO_API_KEY. Cannot run HTTP API fallback. Email sending failed.");
      return false;
    }

    try {
      console.log(`Email Service: Attempting REST API transfer to ${to}...`);
      const apiBody: any = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to.trim().toLowerCase(),
            name: toName.trim(),
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      };

      if (attachments && attachments.length > 0) {
        apiBody.attachment = attachments.map(att => ({
          content: att.content.toString("base64"),
          name: att.filename
        }));
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(apiBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Brevo REST API Fallback Error (${response.status}):`, errorText);
        return false;
      }

      const data = await response.json();
      console.log(`Email successfully sent via Brevo HTTP API to ${to} (Message ID: ${data.messageId})`);
      return true;
    } catch (apiError) {
      console.error("Brevo REST API Fallback failed as well. Email delivery failed.", apiError);
      return false;
    }
  }
}

/**
 * Generates submission confirmation HTML template.
 */
export async function getSubmissionEmailHtml(name: string): Promise<string> {
  const baseUrl = await getBaseUrl();
  const logoUrl = `${baseUrl}/logo.jpg`;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "klucsi@klu.ac.in";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Received</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            border-radius: 0px !important;
          }
          .content {
            padding: 30px 20px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 20px 0;">
        <tr>
          <td align="center">
            <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); overflow: hidden; border: 1px solid #e2e8f0; border-collapse: collapse;">
              
              <!-- Gradient Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 40px 20px; text-align: center;">
                  <img src="${logoUrl}" alt="CSI KARE Logo" style="max-height: 60px; background-color: #ffffff; padding: 6px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); display: inline-block;">
                </td>
              </tr>
              
              <!-- Brand border accent -->
              <tr>
                <td height="4" style="height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #fbbf24 50%, #ef4444 100%); line-height: 0px; font-size: 0px;">&nbsp;</td>
              </tr>
              
              <!-- Body Content -->
              <tr>
                <td class="content" style="padding: 40px; color: #334155;">
                  <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 8px 0; font-weight: 800; text-align: center; letter-spacing: -0.5px;">Application Received! 🎉</h2>
                  <div style="color: #1e3a8a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; margin-bottom: 30px;">CSI KARE Student Branch</div>
                  
                  <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                  <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">Thank you for submitting your application to join the CSI KARE Core Team for the academic year 2026-2027. We are excited about your interest in working with the computer society! Our faculty and executive board are reviewing all submissions.</p>
                  
                  <!-- Alert Callout Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 25px 0; border-radius: 6px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 20px;">
                        <div style="font-weight: 800; color: #78350f; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Next Steps</div>
                        <div style="font-size: 13.5px; color: #92400e; margin: 0; line-height: 1.5;">Applicants will be evaluated based on credentials, academic record (limited to III Year, IV Year warnings apply), and eligibility criteria. Selection status and official appointment letters will be downloadable directly from our portal.</div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0; line-height: 1.6; text-align: center;">You can check your selection status at any time by visiting our selection status checker with your registration number:</p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 15px 0 5px 0;">
                        <a href="${baseUrl}/status" target="_blank" style="display: inline-block; background-color: #1e3a8a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 13px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.25);">Check Selection Status</a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 35px 0 25px 0; border-collapse: collapse;">
                    <tr>
                      <td height="1" style="height: 1px; background-color: #e2e8f0; line-height: 0; font-size: 0;">&nbsp;</td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.5;">Regards,</p>
                  <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 4px 0 0 0;">CSI KARE Faculty Team</h3>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9;">
                  <div style="font-weight: 700; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 6px; font-size: 12px;">CSI KARE STUDENT BRANCH</div>
                  <p style="margin: 2px 0;">Kalasalingam Academy of Research and Education</p>
                  <p style="margin: 6px 0 0 0;">Questions? Contact us at <a href="mailto:${senderEmail}" style="color: #1e3a8a; text-decoration: none; font-weight: 700;">${senderEmail}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

interface SelectionEmailParams {
  id: string;
  name: string;
  role: string;
}

/**
 * Generates the official Selection Notification HTML template.
 */
export async function getSelectionEmailHtml({ id, name, role }: SelectionEmailParams): Promise<string> {
  const baseUrl = await getBaseUrl();
  const logoUrl = `${baseUrl}/logo.jpg`;

  const refNumber = `CSI-KARE-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Appointment Order</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            border-radius: 0px !important;
          }
          .content {
            padding: 30px 20px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 30px 0;">
        <tr>
          <td align="center">
            <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); overflow: hidden; border: 1px solid #cbd5e1; border-collapse: collapse;">
              
              <!-- Luxury Gold/Blue Border Accent -->
              <tr>
                <td height="5" style="height: 5px; background: linear-gradient(90deg, #1e3a8a 0%, #d97706 100%); line-height: 0px; font-size: 0px;">&nbsp;</td>
              </tr>
              
              <!-- Header -->
              <tr>
                <td style="padding: 35px 35px 15px 35px; text-align: center;">
                  <img src="${logoUrl}" alt="CSI Logo" style="max-height: 65px; background-color: #ffffff; padding: 4px 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; margin-bottom: 12px;">
                  <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1.5px; text-transform: uppercase;">CSI KARE STUDENT BRANCH</div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px;">Kalasalingam Academy of Research and Education</div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 15px; font-family: monospace; font-size: 11px; color: #64748b; font-weight: bold;">
                    <tr>
                      <td align="left">ORDER NO: ${refNumber}</td>
                      <td align="right">DATE: ${currentDate}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Dashed Divider -->
              <tr>
                <td height="2" style="border-bottom: 2px dashed #e2e8f0; font-size: 0px; line-height: 0px;">&nbsp;</td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td class="content" style="padding: 35px; color: #334155;">
                  <h2 style="color: #d97706; font-size: 20px; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 25px 0; font-weight: 800;">Official Appointment Order</h2>
                  
                  <p style="font-size: 14.5px; color: #0f172a; margin: 0 0 15px 0;">Dear <strong>${name}</strong>,</p>
                  
                  <p style="font-size: 14.5px; color: #475569; margin: 0 0 20px 0; line-height: 1.6; text-align: justify;">Based on your credentials and the evaluation checks conducted by the CSI KARE Faculty Team, we are pleased to inform you that you have been selected as a core team member of the **CSI KARE Student Branch** for the academic year 2026-2027.</p>
                  
                  <p style="font-size: 14.5px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">You are hereby appointed to the following position with immediate effect:</p>
                  
                  <!-- Appointment Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 10px; margin: 25px 0; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #64748b; font-weight: 600;">Appointee:</td>
                            <td align="right" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13.5px; color: #0f172a; font-weight: 700;">${name}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-size: 13.5px; color: #64748b; font-weight: 600;">Assigned Role:</td>
                            <td align="right" style="padding: 8px 0; font-size: 14.5px; color: #1e3a8a; font-weight: 700;">
                              <span style="background-color: #dbeafe; color: #1e3a8a; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; border: 1px solid #bfdbfe;">${role}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 14.5px; color: #475569; margin: 0 0 25px 0; line-height: 1.6; text-align: justify;">Your official, high-resolution, print-ready PDF appointment letter signed by the Faculty-in-Charge has been generated and is attached to this email. You can also view and download it directly from the portal at any time.</p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0 10px 0;">
                    <tr>
                      <td align="center">
                        <a href="${baseUrl}/status" target="_blank" style="display: inline-block; background-color: #1e3a8a; color: #ffffff !important; text-decoration: none; padding: 15px 30px; font-size: 13px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.25);">Download Official Letter</a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="font-size: 14.5px; color: #475569; margin: 0 0 20px 0; line-height: 1.6; text-align: justify;">Congratulations on your selection! We look forward to your active contribution, leadership, and technical excellence in making this academic year full of successful workshops and events.</p>
                  
                  <!-- Closing Regards -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; border-collapse: collapse;">
                    <tr>
                      <td>
                        <p style="font-size: 13.5px; color: #64748b; margin: 0;">Regards,</p>
                        <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 4px 0 0 0;">Dr. P. Pandiselvam</h4>
                        <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Faculty Incharge, CSI KARE</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer Legal -->
              <tr>
                <td style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  This is an official selection order of the CSI KARE Student Branch. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
