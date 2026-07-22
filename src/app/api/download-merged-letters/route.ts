import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");

  if (!idsStr) {
    return new NextResponse("Missing comma-separated applicant ids query parameter.", { status: 400 });
  }

  const ids = idsStr.split(",").map(id => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return new NextResponse("Invalid or empty applicant IDs list.", { status: 400 });
  }

  if (!adminDb) {
    return new NextResponse("Database not initialized", { status: 500 });
  }

  try {
    // Read Logo Base64
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString("base64");
      }
    } catch (err) {
      console.error("PDF logo read failure:", err);
    }

    // Read Signature Base64
    let sigBase64 = "";
    try {
      const sigPath = path.join(process.cwd(), "public", "signature.jpg");
      if (fs.existsSync(sigPath)) {
        sigBase64 = fs.readFileSync(sigPath).toString("base64");
      }
    } catch (err) {
      console.error("PDF signature read failure:", err);
    }

    // Initialize single jsPDF instance
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let pagesAdded = 0;

    // Fetch and draw each applicant page
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      const docRef = adminDb.collection("Applicants").doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        continue; // Skip missing records
      }

      const app = snap.data()!;
      if (app.status !== "approved") {
        continue; // Skip unapproved applicants in merged download
      }

      // Add a page if we have already drawn previous records
      if (pagesAdded > 0) {
        doc.addPage();
      }
      pagesAdded++;

      // 1. Draw Gold and Navy Double Borders
      // Outermost Navy Border
      doc.setDrawColor(30, 58, 138); // Navy Blue
      doc.setLineWidth(1.2);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      
      // Innermost Gold Border
      doc.setDrawColor(217, 119, 6); // Gold
      doc.setLineWidth(0.6);
      doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

      // Decorative Gold Corner Brackets
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.9);
      const cl = 8; // Corner length in mm
      // Top-Left
      doc.line(9.5, 9.5, 9.5 + cl, 9.5);
      doc.line(9.5, 9.5, 9.5, 9.5 + cl);
      // Top-Right
      doc.line(pageWidth - 9.5, 9.5, pageWidth - 9.5 - cl, 9.5);
      doc.line(pageWidth - 9.5, 9.5, pageWidth - 9.5, 9.5 + cl);
      // Bottom-Left
      doc.line(9.5, pageHeight - 9.5, 9.5 + cl, pageHeight - 9.5);
      doc.line(9.5, pageHeight - 9.5, 9.5, pageHeight - 9.5 - cl);
      // Bottom-Right
      doc.line(pageWidth - 9.5, pageHeight - 9.5, pageWidth - 9.5 - cl, pageHeight - 9.5);
      doc.line(pageWidth - 9.5, pageHeight - 9.5, pageWidth - 9.5, pageHeight - 9.5 - cl);

      // 2. Centered CSI Watermark (Low Opacity)
      if (logoBase64) {
        try {
          const gState = new (doc as any).GState({ opacity: 0.02 });
          doc.saveGraphicsState();
          doc.setGState(gState);
          doc.addImage(`data:image/jpeg;base64,${logoBase64}`, "JPEG", (pageWidth - 120) / 2, (pageHeight - 120) / 2, 120, 120);
          doc.restoreGraphicsState();
        } catch (watermarkErr) {
          console.error("Watermark generation failure:", watermarkErr);
        }
      }

      // 3. Add Header Logo
      if (logoBase64) {
        doc.addImage(`data:image/jpeg;base64,${logoBase64}`, "JPEG", (pageWidth - 28) / 2, 15, 28, 20);
      }

      // 4. Official Heading
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text("COMPUTER SOCIETY OF INDIA", pageWidth / 2, 43, { align: "center" });

      doc.setFont("times", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("CSI KARE Student Branch • Kalasalingam Academy of Research and Education", pageWidth / 2, 48, { align: "center" });

      // 5. Divider Line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(15, 52, pageWidth - 15, 52);

      // 6. Metadata Header
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      
      const appYear = app.timestamp && app.timestamp.toDate 
        ? app.timestamp.toDate().getFullYear() 
        : new Date().getFullYear();
      const referenceNumber = app.referenceNumber || `CSI-KARE-ORD-${appYear}-${app.registrationNumber.substring(app.registrationNumber.length - 4)}`;
      
      const formattedDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      doc.text(`REF NO: ${referenceNumber}`, 15, 59);
      doc.text(`DATE: ${formattedDate}`, pageWidth - 15, 59, { align: "right" });

      doc.line(15, 63, pageWidth - 15, 63);

      // 7. Document Title
      doc.setTextColor(30, 58, 138); // Navy Blue
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.text("OFFICIAL APPOINTMENT ORDER", pageWidth / 2, 74, { align: "center" });

      // 8. Salutation
      doc.setTextColor(15, 23, 42);
      doc.setFont("times", "bold");
      doc.setFontSize(11.5);
      doc.text(`Dear ${app.name},`, 15, 85);

      // 9. Body (Performance and contributions focused)
      doc.setFont("times", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      const p1 = "Based on your active performance and contributions towards the student branch activities, we are pleased to inform you that you have been selected to coordinate the Computer Society of India (CSI) Student Branch at Kalasalingam Academy of Research and Education for the academic year 2026-2027.";
      const p2 = "You are hereby assigned the following designation with immediate effect, to carry out the branch initiatives and leadership roles:";

      let yOffset = 92;
      const splitP1 = doc.splitTextToSize(p1, pageWidth - 30);
      doc.text(splitP1, 15, yOffset);
      yOffset += (splitP1.length * 5.5) + 3;

      const splitP2 = doc.splitTextToSize(p2, pageWidth - 30);
      doc.text(splitP2, 15, yOffset);
      yOffset += (splitP2.length * 5.5) + 5;

      // 10. Premium Details Card with Gold Vertical Border Accent
      const boxStartY = yOffset;
      const boxHeight = 30;
      
      // Background Fill in Golden Cream
      doc.setFillColor(253, 251, 247);
      doc.rect(15, boxStartY, pageWidth - 30, boxHeight, "F");
      
      // Gold block vertical accent line on the left side
      doc.setFillColor(217, 119, 6); // Gold
      doc.rect(15, boxStartY, 1.5, boxHeight, "F");

      // Other 3 borders in thin slate grey
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(16.5, boxStartY, pageWidth - 15, boxStartY); // Top
      doc.line(16.5, boxStartY + boxHeight, pageWidth - 15, boxStartY + boxHeight); // Bottom
      doc.line(pageWidth - 15, boxStartY, pageWidth - 15, boxStartY + boxHeight); // Right

      // Text labels inside card
      doc.setFont("times", "bold");
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(10);
      doc.text("Appointee Name:", 20, boxStartY + 8);
      doc.text("Assigned Role / Designation:", 20, boxStartY + 16);
      doc.text("Organization Unit:", 20, boxStartY + 24);

      // Dynamic app details right-aligned
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(app.name, pageWidth - 20, boxStartY + 8, { align: "right" });
      doc.setTextColor(30, 58, 138); // Navy Blue
      doc.text(app.approvedRole || app.priority1 || "Branch Coordinator", pageWidth - 20, boxStartY + 16, { align: "right" });
      doc.setTextColor(15, 23, 42);
      doc.text("CSI KARE Student Branch", pageWidth - 20, boxStartY + 24, { align: "right" });

      yOffset = boxStartY + boxHeight + 8;

      // 11. Expectations
      doc.setFont("times", "normal");
      doc.setTextColor(51, 65, 85);
      
      const p3 = "In this role, you will be responsible for coordinating technical events, student workshops, and supporting the branch in achieving new milestones. We appreciate your dedication and commitment towards the student branch activities.";
      const p4 = "Congratulations on your appointment! We look forward to your active participation and leadership in driving the branch activities forward.";

      const splitP3 = doc.splitTextToSize(p3, pageWidth - 30);
      doc.text(splitP3, 15, yOffset);
      yOffset += (splitP3.length * 5.5) + 3;

      const splitP4 = doc.splitTextToSize(p4, pageWidth - 30);
      doc.text(splitP4, 15, yOffset);
      yOffset += (splitP4.length * 5.5) + 6;

      // 12. Regards Block
      doc.setFont("times", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Regards,", 15, yOffset);
      doc.setTextColor(30, 58, 138); // Navy Blue
      doc.text("CSI KARE Student Branch", 15, yOffset + 5);

      // 13. Centered Counselor Signature Box
      const sigX = pageWidth / 2; // Center of page

      if (sigBase64) {
        doc.addImage(`data:image/jpeg;base64,${sigBase64}`, "JPEG", sigX - 15, yOffset + 11, 30, 13);
      }

      // Signature Underline Line
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setLineWidth(0.4);
      doc.line(sigX - 25, yOffset + 25, sigX + 25, yOffset + 25);

      // Faculty Counselor Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.text("Dr. P. Pandiselvam", sigX, yOffset + 29, { align: "center" });

      doc.setTextColor(100, 116, 139);
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.text("FACULTY INCHARGE", sigX, yOffset + 33, { align: "center" });
      doc.text("CSI KARE Student Branch", sigX, yOffset + 37, { align: "center" });

      // Page number bottom center for this candidate
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page 1 of 1`, pageWidth / 2, pageHeight - 11, { align: "center" });
    }

    if (pagesAdded === 0) {
      return new NextResponse("No approved letters generated. Ensure selected applicants are approved.", { status: 404 });
    }

    // Output PDF Buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=CSI_KARE_Merged_Letters_${Date.now()}.pdf`
      }
    });

  } catch (err) {
    console.error("Merged PDF generation failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
