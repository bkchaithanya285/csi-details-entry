import admin from "firebase-admin";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

if (!getApps().length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
    let serviceAccount: any = null;

    // 1. Check environment variables directly
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      };
      console.log("Firebase Admin SDK credentials loaded from Environment Variables.");
    } 
    // 2. Check path in environment variable
    else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, "utf8");
      serviceAccount = JSON.parse(fileContent);
      console.log("Firebase Admin SDK credentials loaded from JSON file path.");
    } 
    // 3. Fallback: Search the workspace root for the CSI credentials file
    else {
      const defaultFilename = "csi-appointement-firebase-adminsdk-fbsvc-d189c7ef37.json";
      const defaultRelativePath = path.join(process.cwd(), defaultFilename);
      
      if (fs.existsSync(defaultRelativePath)) {
        const fileContent = fs.readFileSync(defaultRelativePath, "utf8");
        serviceAccount = JSON.parse(fileContent);
        console.log("Firebase Admin SDK credentials loaded from default root JSON fallback.");
      } else {
        // Broad search for any firebase-adminsdk json file in the root
        const files = fs.readdirSync(process.cwd());
        const jsonFile = files.find(f => f.includes("firebase-adminsdk") && f.endsWith(".json"));
        if (jsonFile) {
          const fileContent = fs.readFileSync(path.join(process.cwd(), jsonFile), "utf8");
          serviceAccount = JSON.parse(fileContent);
          console.log(`Firebase Admin SDK loaded from dynamically discovered json file: ${jsonFile}`);
        }
      }
    }

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } else {
      console.warn("Firebase Admin SDK Service Account credentials not found. Server actions may fail.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
  }
}

const adminDb = getApps().length ? getFirestore() : null;
const adminAuth = getApps().length ? getAuth() : null;

export { admin, adminDb, adminAuth };
export default admin;
