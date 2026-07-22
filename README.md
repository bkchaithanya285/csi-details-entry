# CSI KARE Student Member Registry Portal

A premium, highly secure student member details registry portal for the Computer Society of India (CSI) student branch at Kalasalingam Academy of Research and Education. Built with Next.js (App Router), TypeScript, Tailwind CSS, Firebase, and Brevo SMTP relay.

---

## 🚀 One-Click Deployment to Vercel

The easiest way to deploy this portal is to link your GitHub repository to [Vercel](https://vercel.com).

### Step-by-Step Guide:

1. Go to [Vercel Dashboard](https://vercel.com/new) and click **Import** next to your `csi-details-entry` repository.
2. Under **Framework Preset**, select **Next.js**.
3. Under **Build and Development Settings**, you can keep the defaults. (The build command `npm run build` will execute webpack compilation successfully).
4. Expand the **Environment Variables** section and copy-paste the variables from your local `.env.local` file:

```env
# Brevo SMTP Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=klucsi@klu.ac.in
SMTP_PASS=xkeysib-your-actual-api-key-here
SENDER_EMAIL=klucsi@klu.ac.in
SENDER_NAME=CSI KARE Student Branch

# Firebase Admin SDK credentials
FIREBASE_PROJECT_ID=csi-appointement
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@csi-appointement.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-actual-private-key-here..."
```

> ⚠️ **IMPORTANT**: Make sure the `FIREBASE_PRIVATE_KEY` environment variable on Vercel includes the quote marks and standard `\n` characters to ensure the Firebase Admin SDK can parse the private key safely!

5. Click **Deploy**. Vercel will build, optimize, and launch your live URL in under 2 minutes.

---

## 🔒 Security Measures
- Private variables and Firebase key files are explicitly ignored via `.gitignore` to prevent leaks.
- Student registry route `/status` has been removed. All administrative actions (approving, editing, generating letters, and mailing orders) happen strictly inside the secure `/admin` control panel.

---

## ⚙️ Administration
- **Control panel URL**: `https://your-domain.vercel.app/admin`
- **Username**: `admin`
- **Password**: `Tony@285`
