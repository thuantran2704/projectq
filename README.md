# Hospital Career Dispatcher & Resume Manager (ProjectQ)

A fullstack application designed to streamline applying for hospital and healthcare roles. It enables uploading and managing resumes securely using **Google Cloud Storage (GCP)**, customizing pre-made hospital application email templates, selecting between resumes, and dispatching applications directly to hospital hiring contacts with the chosen resume attached.

---

## 🏗️ Architecture & Project Structure

The project is structured with clean separation of concerns using npm workspaces:

```
projectq/
├── frontend/               # React + Vite + Tailwind CSS + Lucide Icons + TypeScript
│   ├── src/
│   │   ├── api/            # API clients for resumes and email dispatching
│   │   ├── components/     # ResumeManager and EmailDispatcher UI components
│   │   ├── types/          # Shared TypeScript models
│   │   ├── App.tsx         # Main interactive dashboard
│   │   └── index.css       # Tailwind CSS styling
│   ├── .env.example        # Frontend environment template
│   └── package.json
│
├── backend/                # Node.js + Express + TypeScript + GCP Cloud Storage + Nodemailer
│   ├── src/
│   │   ├── config/         # GCP Cloud Storage client and Nodemailer transporter
│   │   ├── controllers/    # Resume upload/list/download/delete & email handlers
│   │   ├── routes/         # Express REST API routes (/api/resumes, /api/email)
│   │   ├── templates/      # Pre-built hospital email templates (RN, Assistant, Follow-up, etc.)
│   │   └── index.ts        # Server entrypoint
│   ├── .env.example        # Backend environment template (GCP keys & SMTP settings)
│   └── package.json
│
├── middleware/             # Standalone middleware package (@projectq/middleware)
│   ├── src/
│   │   ├── upload.ts       # Multer memory storage & PDF/DOCX file validation
│   │   ├── logger.ts       # Request duration and status logging
│   │   ├── errorHandler.ts # Centralized error handling and AppError class
│   │   ├── auth.ts         # Optional API key protection
│   │   └── index.ts
│   └── package.json
│
├── .gitignore              # Git ignore rules protecting credentials, keys, and builds
├── .env.example            # Root environment reference
├── package.json            # Root workspace orchestrator (runs dev concurrently)
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```
This installs dependencies across all workspaces (`frontend`, `backend`, and `middleware`).

---

### 2. Configure Environment Variables

1. Copy the example `.env` file for the backend:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Fill in your **Google Cloud Storage (GCP)** credentials:
   - `GCP_PROJECT_ID`: Your GCP project ID.
   - `GCP_BUCKET_NAME`: The Cloud Storage bucket name (e.g., `my-resumes-bucket`).
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your downloaded GCP Service Account key JSON file (e.g. `./service-account-key.json`).
   > *Note: If GCP credentials are not yet configured, the system automatically runs in local fallback mode so you can test uploading and managing resumes immediately!*

3. Fill in your **Gmail / SMTP** email settings:
   - `SMTP_USER`: Your Gmail address (e.g., `yourname@gmail.com`).
   - `SMTP_PASS`: A 16-character **Google App Password** (generate one at [Google Account App Passwords](https://myaccount.google.com/apppasswords)).
   - `SMTP_FROM_NAME`: Your name as it should appear in hospital inboxes.
   > *Note: If email settings are not configured, the backend runs in simulated test mode, previewing sent emails in the console without failing.*

---

### 3. Run Development Servers
From the root directory, run:
```bash
npm run dev
```
This starts both:
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

---

## 🏥 Features

1. **Cloud Resume Manager**:
   - Upload multiple resumes in `.pdf`, `.doc`, or `.docx` format directly to Google Cloud Storage.
   - Visual badges indicating upload timestamp, file size, and storage provider.
   - One-click selection to choose which resume to attach.
   - Delete outdated resumes with confirmation.
   - Preview and download resumes.

2. **Hospital Email Dispatcher**:
   - Built-in templates:
     - **Registered Nurse / Staff Nurse Application**
     - **General Healthcare Staff Application**
     - **Application Status Follow-up**
     - **Clinical Rotation / Residency Inquiry**
   - Personalization fields: Hospital Name, Department/Role, Applicant Name, Phone, and Email.
   - Instant variable replacement with live preview.
   - Attaches the selected resume from Cloud Storage automatically when sending.

---

## 📦 Pushing to GitHub

To push this project to a new repository on GitHub:

1. Create a new repository on [GitHub](https://github.com/new) (e.g., `projectq`).
2. Run the following commands in this directory:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/projectq.git
   git branch -M main
   git push -u origin main
   ```
