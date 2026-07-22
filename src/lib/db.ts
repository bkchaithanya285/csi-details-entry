"use server";

import { adminDb } from "./firebaseAdmin";
import { sendEmail, getSubmissionEmailHtml, getSelectionEmailHtml } from "./email";
import { ROLE_LIMITS } from "./constants";

export interface Applicant {
  id: string;
  name: string;
  registrationNumber: string;
  year: string;
  department: string;
  section: string;
  email: string;
  phone: string;
  priority1: string;
  priority2: string;
  priority3: string;
  status: "pending" | "approved" | "rejected";
  approvedRole?: string;
  referenceNumber?: string;
  timestamp: number | null;
}

/**
 * Checks if a registration number already exists in the Applicants collection.
 */
export async function checkRegistrationExists(regNo: string): Promise<boolean> {
  if (!regNo || !adminDb) return false;
  try {
    const querySnapshot = await adminDb.collection("Applicants")
      .where("registrationNumber", "==", regNo.trim().toUpperCase())
      .get();
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking registration number:", error);
    return false;
  }
}

/**
 * Checks if an email already exists in the Applicants collection.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email || !adminDb) return false;
  try {
    const querySnapshot = await adminDb.collection("Applicants")
      .where("email", "==", email.trim().toLowerCase())
      .get();
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking email address:", error);
    return false;
  }
}

/**
 * Submits a new applicant to the database.
 */
export async function submitApplicant(data: any) {
  if (!adminDb) {
    throw new Error("Database not initialized");
  }

  const payload = {
    name: data.name.trim(),
    registrationNumber: data.registrationNumber.trim().toUpperCase(),
    year: data.year,
    department: data.department.trim(),
    section: data.section.trim().toUpperCase(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    priority1: data.priority1 || "",
    priority2: data.priority2 || "",
    priority3: data.priority3 || "",
    status: "pending",
    timestamp: Date.now(),
  };

  const docRef = await adminDb.collection("Applicants").add(payload);

  return { id: docRef.id };
}

/**
 * Retrieves all applicants.
 */
export async function getApplicants(): Promise<Applicant[]> {
  if (!adminDb) return [];
  try {
    const snapshot = await adminDb.collection("Applicants")
      .orderBy("timestamp", "desc")
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        registrationNumber: data.registrationNumber || "",
        year: data.year || "",
        department: data.department || "",
        section: data.section || "",
        email: data.email || "",
        phone: data.phone || "",
        priority1: data.priority1 || "",
        priority2: data.priority2 || "",
        priority3: data.priority3 || "",
        status: data.status || "pending",
        approvedRole: data.approvedRole || "",
        referenceNumber: data.referenceNumber || "",
        timestamp: data.timestamp
          ? data.timestamp.toDate
            ? data.timestamp.toDate().getTime()
            : new Date(data.timestamp).getTime()
          : null,
      };
    });
  } catch (error) {
    console.error("Error getting applicants:", error);
    return [];
  }
}

/**
 * Updates an applicant's status directly.
 */
export async function updateApplicantStatus(id: string, newStatus: "pending" | "approved" | "rejected") {
  if (!adminDb) throw new Error("Database not initialized");
  try {
    await adminDb.collection("Applicants").doc(id).update({ status: newStatus });
    return { success: true };
  } catch (error) {
    console.error("Error updating status:", error);
    throw error;
  }
}

/**
 * Approves an applicant with a specific role, updates status, generates a reference number, and emails them.
 */
export async function approveApplicantWithRole(id: string, role: string) {
  if (!adminDb) throw new Error("Database not initialized");
  try {
    const docRef = adminDb.collection("Applicants").doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error("Applicant not found");
    }

    const appData = doc.data()!;
    const appYear = appData.timestamp && appData.timestamp.toDate 
      ? appData.timestamp.toDate().getFullYear() 
      : new Date().getFullYear();
    
    const regNo = appData.registrationNumber || "";
    const lastFour = regNo.substring(regNo.length - 4) || Math.floor(1000 + Math.random() * 9000).toString();
    const referenceNumber = `CSI-KARE-ORD-${appYear}-${lastFour}`;

    await docRef.update({
      status: "approved",
      approvedRole: role,
      referenceNumber: referenceNumber
    });

    // Send selection confirmation email
    if (appData.email) {
      const emailHtml = await getSelectionEmailHtml({
        id: id,
        name: appData.name,
        role: role
      });

      await sendEmail({
        to: appData.email,
        toName: appData.name,
        subject: `Appointment Order: Selection for ${role} - CSI KARE Core Team`,
        htmlContent: emailHtml
      });
    }

    return { success: true, referenceNumber };
  } catch (error) {
    console.error("Error in approveApplicantWithRole:", error);
    throw error;
  }
}

export async function updateApplicant(id: string, data: Partial<Applicant>) {
  if (!adminDb) throw new Error("Database not initialized");
  try {
    await adminDb.collection("Applicants").doc(id).update(data);
    return { success: true };
  } catch (error) {
    console.error("Error updating applicant:", error);
    throw error;
  }
}

/**
 * Deletes a single applicant.
 */
export async function deleteApplicant(id: string) {
  if (!adminDb) throw new Error("Database not initialized");
  try {
    await adminDb.collection("Applicants").doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting applicant:", error);
    throw error;
  }
}

/**
 * Deletes all applicants in batched transactions.
 */
export async function deleteAllApplicants() {
  if (!adminDb) throw new Error("Database not initialized");
  try {
    const querySnapshot = await adminDb.collection("Applicants").get();
    const docs = querySnapshot.docs;

    const batchLimit = 400;
    for (let i = 0; i < docs.length; i += batchLimit) {
      const batch = adminDb.batch();
      const chunk = docs.slice(i, i + batchLimit);
      chunk.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    return { success: true, count: docs.length };
  } catch (error) {
    console.error("Error deleting all applicants:", error);
    throw error;
  }
}

/**
 * Retrieves an applicant by registration number.
 */
export async function getApplicantByRegNumber(regNo: string): Promise<Applicant | null> {
  if (!regNo || !adminDb) return null;
  try {
    const querySnapshot = await adminDb.collection("Applicants")
      .where("registrationNumber", "==", regNo.trim().toUpperCase())
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name,
      registrationNumber: data.registrationNumber,
      year: data.year,
      department: data.department,
      section: data.section,
      email: data.email,
      phone: data.phone,
      priority1: data.priority1,
      priority2: data.priority2,
      priority3: data.priority3,
      status: data.status,
      approvedRole: data.approvedRole || null,
      referenceNumber: data.referenceNumber || null,
      timestamp: data.timestamp
        ? data.timestamp.toDate
          ? data.timestamp.toDate().toISOString()
          : new Date(data.timestamp).toISOString()
        : null,
    } as any;
  } catch (error) {
    console.error("Error getting applicant by reg number:", error);
    return null;
  }
}



export async function getRoleCounts(): Promise<Record<string, number>> {
  if (!adminDb) return {};
  try {
    const snapshot = await adminDb.collection("Applicants")
      .where("status", "==", "approved")
      .get();
    
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const role = data.approvedRole || data.priority1;
      if (role) {
        counts[role] = (counts[role] || 0) + 1;
      }
    });
    return counts;
  } catch (error) {
    console.error("Error retrieving role counts:", error);
    return {};
  }
}
