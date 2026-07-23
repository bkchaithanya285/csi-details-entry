import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const regNo = searchParams.get("regNo");

  if (!regNo) {
    return new NextResponse("Missing regNo parameter.", { status: 400 });
  }

  if (!adminDb) {
    return new NextResponse("Database not initialized", { status: 500 });
  }

  try {
    const snapshot = await adminDb
      .collection("Applicants")
      .where("registrationNumber", "==", regNo.trim().toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return new NextResponse("Applicant not found", { status: 404 });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({
      id: doc.id,
      name: data.name,
      registrationNumber: data.registrationNumber,
      status: data.status,
      approvedRole: data.approvedRole || null,
      referenceNumber: data.referenceNumber || null,
    });
  } catch (err) {
    console.error("Status API error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
