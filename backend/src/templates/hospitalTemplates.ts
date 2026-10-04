export interface HospitalEmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  description: string;
}

export const HOSPITAL_EMAIL_TEMPLATES: HospitalEmailTemplate[] = [
  {
    id: 'nurse-application',
    name: 'Registered Nurse / Staff Nurse Application',
    category: 'Nursing',
    subject: 'Application for Registered Nurse Position - {{applicantName}}',
    description: 'Professional cover email for RN or staff nursing positions at a hospital.',
    body: `Dear Hiring Manager and Nursing Leadership at {{hospitalName}},

I hope this email finds you well.

I am writing to express my strong interest in the Registered Nurse position within the {{department}} department at {{hospitalName}}. With my active nursing license, clinical training, and dedicated commitment to patient-centered care, I am eager to contribute to your healthcare team.

In my previous clinical experiences, I have developed strong competencies in patient assessment, medication administration, multidisciplinary collaboration, and rapid response in acute care environments. I admire {{hospitalName}}'s reputation for clinical excellence and compassionate patient outcomes.

Please find my resume attached for your review. I would welcome the opportunity to discuss how my clinical background, dedication, and work ethic align with the needs of {{hospitalName}}.

Thank you very much for your time and consideration.

Warm regards,

{{applicantName}}
{{applicantPhone}}
{{applicantEmail}}`
  },
  {
    id: 'general-healthcare-inquiry',
    name: 'General Healthcare Staff Application',
    category: 'General Clinical',
    subject: 'Job Inquiry: {{position}} - {{applicantName}}',
    description: 'Versatile application template for any hospital role (Allied Health, Tech, Clinic).',
    body: `Dear Hiring Team at {{hospitalName}},

I am reaching out to submit my application for the {{position}} opening (or general consideration) within {{hospitalName}}.

Having followed {{hospitalName}}'s impactful work in the community, I am deeply inspired by your standard of quality patient care. My background includes relevant hands-on experience, a strong team orientation, and an unwavering commitment to patient safety and operational excellence.

I have attached my current resume detailing my qualifications, certifications, and experience. I look forward to the possibility of discussing how I can add value to your team.

Thank you for your time and review.

Sincerely,

{{applicantName}}
{{applicantPhone}}
{{applicantEmail}}`
  },
  {
    id: 'application-followup',
    name: 'Application Status Follow-up',
    category: 'Follow-up',
    subject: 'Following up on application: {{position}} - {{applicantName}}',
    description: 'Courteous follow-up email after submitting an application 1-2 weeks prior.',
    body: `Dear Hiring Team at {{hospitalName}},

I hope you are having a wonderful week.

I am following up on the application I submitted recently for the {{position}} role at {{hospitalName}}. I remain very enthusiastic about this opportunity and the prospect of supporting your patient care mission.

I have re-attached my resume here for your convenience. Please let me know if there are any additional materials or references I can provide.

Thank you once again for your time and consideration.

Best regards,

{{applicantName}}
{{applicantPhone}}
{{applicantEmail}}`
  },
  {
    id: 'clinical-rotation-inquiry',
    name: 'Clinical Rotation / Residency Inquiry',
    category: 'Students & Trainees',
    subject: 'Clinical Placement / Residency Inquiry - {{applicantName}}',
    description: 'Inquiry regarding clinical placements, shadow opportunities, or residency programs.',
    body: `Dear Education & Clinical Placement Coordinator at {{hospitalName}},

My name is {{applicantName}}, and I am reaching out to inquire about available opportunities for {{position}} at {{hospitalName}}.

I am eager to learn and train alongside your esteemed medical and clinical staff. My academic foundation, clinical enthusiasm, and dedication to ethical healthcare make me excited for the opportunity to learn from your team.

My resume is attached for your consideration. I would appreciate the opportunity to speak with you regarding possible placement or next steps.

Thank you for supporting rising healthcare professionals!

Warm regards,

{{applicantName}}
{{applicantPhone}}
{{applicantEmail}}`
  }
];
