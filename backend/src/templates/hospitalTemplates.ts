export interface HospitalEmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  description: string;
  defaultApplicant?: {
    name: string;
    school: string;
    program: string;
    nclexDate: string;
    phone: string;
    email: string;
    linkedin: string;
    experienceUnits: string;
  };
}

export const HOSPITAL_EMAIL_TEMPLATES: HospitalEmailTemplate[] = [
  {
    id: 'nurse-residency-2027',
    name: '2027 Graduate Nurse Residency (Quynh Nguyen - USF Nursing)',
    category: 'Nurse Residency',
    subject: '2027 Graduate Nurse Residency Applicant | USF Nursing | NCLEX May 2027 | {{applicantName}}',
    description: 'Application for Quynh Nguyen targeting 2027 Graduate Nurse Residency Programs with clinical rotation experience.',
    defaultApplicant: {
      name: 'Quynh Nguyen',
      school: 'University of South Florida College of Nursing',
      program: '2027 Graduate Nurse Residency Program',
      nclexDate: 'May 2027',
      phone: '813-834-8336',
      email: 'nguyenquynh11102005@gmail.com',
      linkedin: 'www.linkedin.com/in/quynhnhat-ngn',
      experienceUnits: 'PICU, NICU, ICU, ER, PACU, PCU, Labor & Delivery, Postpartum, Newborn Nursery, Med-Surg, Inpatient Psychiatric, Nephrology, Dialysis, and CT'
    },
    body: `Dear {{hiringTeam}},

I'm {{applicantName}}, a nursing student at the {{school}}, and I'm writing to apply for your {{program}} at {{hospitalName}}. I'm anticipated to take the NCLEX in {{nclexDate}}, and I would be honored to begin my nursing career with your hospital.

If you can help, I'd be grateful to know:

1. Which units expect openings for new graduates in the 2027 cohort?
2. Does your hospital offer visa sponsorship for new graduate nurses, and in which units or programs? I'm an international candidate.
3. What are the application deadlines and next steps?

My experience spans {{experienceUnits}}. I'm open to any unit where I'm needed, and I will bring heart, hard work, and a real hunger to learn wherever you place me.

My resume is attached, and I'm happy to send anything else you need. Thank you for your time and for the care your team gives every day.

With sincere gratitude,

{{applicantName}}
Fall 2025 - Upper Division | USF College of Nursing, Tampa
{{applicantPhone}} | {{applicantEmail}}
{{applicantLinkedin}}`
  },
  {
    id: 'nurse-residency-followup',
    name: 'Residency Application Follow-up',
    category: 'Follow-up',
    subject: 'Following up on Nurse Residency Application | {{applicantName}}',
    description: 'Courteous follow-up email after submitting an application.',
    defaultApplicant: {
      name: 'Quynh Nguyen',
      school: 'University of South Florida College of Nursing',
      program: '2027 Graduate Nurse Residency Program',
      nclexDate: 'May 2027',
      phone: '813-834-8336',
      email: 'nguyenquynh11102005@gmail.com',
      linkedin: 'www.linkedin.com/in/quynhnhat-ngn',
      experienceUnits: 'PICU, NICU, ICU, ER, PACU, PCU, Labor & Delivery, Postpartum, Newborn Nursery, Med-Surg, Inpatient Psychiatric, Nephrology, Dialysis, and CT'
    },
    body: `Dear {{hiringTeam}},

I hope you are having a wonderful week.

I am following up on my application for the {{program}} at {{hospitalName}} that I submitted recently. I remain deeply enthusiastic about the opportunity to train and contribute as a new graduate nurse with your team.

I have re-attached my resume for your convenience. Please let me know if there are any upcoming interview timelines or additional documents I can provide.

Thank you once again for your dedication to patient care and for considering my application.

Warm regards,

{{applicantName}}
Fall 2025 - Upper Division | USF College of Nursing, Tampa
{{applicantPhone}} | {{applicantEmail}}
{{applicantLinkedin}}`
  },
  {
    id: 'general-healthcare-inquiry',
    name: 'General Healthcare Staff Application',
    category: 'General Clinical',
    subject: 'Job Inquiry: {{position}} - {{applicantName}}',
    description: 'Versatile application template for any hospital role (Allied Health, Tech, Clinic).',
    body: `Dear {{hiringTeam}},

I am reaching out to submit my application for the {{position}} opening within {{hospitalName}}.

Having followed {{hospitalName}}'s impactful work in the community, I am deeply inspired by your standard of quality patient care. My background includes relevant hands-on clinical experience, a strong team orientation, and an unwavering commitment to patient safety.

I have attached my current resume detailing my qualifications, certifications, and experience. I look forward to the possibility of discussing how I can add value to your team.

Thank you for your time and review.

Sincerely,

{{applicantName}}
{{applicantPhone}}
{{applicantEmail}}`
  }
];
