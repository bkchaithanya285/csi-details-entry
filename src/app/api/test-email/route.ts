import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get("email") || "klucsi@klu.ac.in";

  try {
    const htmlTestContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; pb-2;">Brevo SMTP / API Diagnostic</h2>
        <p>This is a successful test email from the **CSI KARE Appointment Portal** email subsystem.</p>
        <div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 13px; color: #334155; margin: 15px 0;">
          <strong>Diagnostic Information:</strong><br />
          &bull; Method: SMTP / API Fallback<br />
          &bull; Sender: klucsi@klu.ac.in<br />
          &bull; Recipient: ${emailParam}
        </div>
        <p style="font-size: 12px; color: #64748b;">If you are reading this email, the mail subsystem is 100% functional and ready for production bulk releases!</p>
      </div>
    `;

    const success = await sendEmail({
      to: emailParam,
      toName: "CSI KARE Admin Tester",
      subject: "Diagnostic Check - CSI KARE Email System",
      htmlContent: htmlTestContent
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Diagnostic email successfully sent to ${emailParam}. Please check your inbox or spam folder.`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Email sending failed. Please check server console logs for SMTP / REST API details."
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Test email diagnostic route failed:", err);
    return NextResponse.json({
      success: false,
      message: err.message || "Internal server error during email dispatch."
    }, { status: 500 });
  }
}
