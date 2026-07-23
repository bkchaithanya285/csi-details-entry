import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendEmail, getSelectionEmailHtml } from "@/lib/email";

export async function POST(request: NextRequest) {
  if (!adminDb) {
    return new NextResponse("Database not initialized", { status: 500 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return new NextResponse("Missing applicant ID.", { status: 400 });
    }

    const docRef = adminDb.collection("Applicants").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return new NextResponse("Applicant not found.", { status: 404 });
    }

    const app = snap.data()!;

    if (app.status !== "approved") {
      return new NextResponse("Applicant is not approved. Cannot resend.", { status: 403 });
    }

    if (!app.email) {
      return new NextResponse("No email address on record for this applicant.", { status: 400 });
    }

    const emailHtml = await getSelectionEmailHtml({
      id,
      name: app.name,
      role: app.approvedRole || app.priority1 || "Core Team Member",
    });

    const sent = await sendEmail({
      to: app.email,
      toName: app.name,
      subject: `Appointment Order: ${app.approvedRole || app.priority1} — CSI KARE Core Team`,
      htmlContent: emailHtml,
    });

    if (!sent) {
      return new NextResponse("Email delivery failed. Check SMTP settings.", { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Email resent to ${app.email}` });
  } catch (err) {
    console.error("Resend email API error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
