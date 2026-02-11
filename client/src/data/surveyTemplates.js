
const generateTemplates = (category, baseTitle, icon, count, baseQuestions) => {
    return Array.from({ length: count }, (_, i) => ({
        id: `${category.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
        title: `${baseTitle} - Variation ${i + 1}`,
        category: category,
        description: `Standard ${baseTitle.toLowerCase()} template for ${category} scenario ${i + 1}.`,
        icon: icon,
        definition: {
            title: `${baseTitle} ${i + 1}`,
            pages: [{ name: "page1", elements: baseQuestions }]
        }
    }));
};

const cxTitles = [
    "Net Promoter Score (NPS)", "Customer Satisfaction (CSAT)", "Customer Effort Score (CES)",
    "Post-Purchase Feedback", "Website Usability Survey", "Churn Survey", "Brand Awareness",
    "Product Satisfaction", "Service Quality", "Support Ticket Feedback", "Mobile App Feedback",
    "User Experience (UX)", "Customer Loyalty", "Voice of Customer", "Relationship Survey",
    "Onboarding Feedback", "Feature Request", "Beta Testing Feedback", "Cancellation Survey",
    "Subscription Renewal", "Store Visit Feedback", "Call Center Experience", "Touchpoint Feedback",
    "Email Newsletter Feedback", "Content Quality", "Ad Effectiveness", "Market Perception",
    "Competitor Analysis", "Price Sensitivity", "Features Priority", "Return Policy Feedback",
    "Shipping Experience", "Packaging Feedback", "Unboxing Experience", "Warranty Registration",
    "Loyalty Program Feedback", "Referral Program", "Community Feedback", "Social Media Engagement",
    "Influencer Campaign", "Partnership Satisfaction", "Vendor Feedback", "Client Satisfaction",
    "Project Completion", "Quarterly Business Review", "Annual Client Survey", "Contract Renewal",
    "Lost Deal Analysis", "Win/Loss Analysis", "Sales Process Feedback"
];

const hrTitles = [
    "Employee Engagement", "Employee Satisfaction", "Onboarding Feedback", "Exit Interview",
    "360 Degree Feedback", "Performance Review", "Manager Feedback", "Team Effectiveness",
    "Work-Life Balance", "Remote Work Survey", "Training Effectiveness", "Benefits Satisfaction",
    "Company Culture", "Diversity & Inclusion", "Internal Communications", "Leadership Assessment",
    "Peer Review", "Self Assessment", "Goal Setting", "Project Retro", "Meeting Effectiveness",
    "Hackathon Feedback", "Wellness Survey", "Safety Culture", "Incident Report", "Whistleblower Form",
    "Job Application", "Candidate Experience", "Recruitment Process", "Interviewer Feedback",
    "Employee Recognition", "Career Development", "Mentorship Program", "Internship Feedback",
    "Holiday Party Feedback", "Town Hall Feedback", "Policy Change Feedback", "IT Support Feedback",
    "Facilities Feedback", "Cafeteria Feedback", "Relocation Survey", "Travel Policy Feedback",
    "Expense Process", "Payroll Feedback", "HR Service Delivery", "Employee Advocacy",
    "Volunteer Program", "CSR Initiatives", "Innovation Challenge", "Suggestion Box"
];

const healthcareTitles = [
    "Patient Satisfaction", "Post-Appointment Feedback", "Hospital Stay Experience", "Doctor Assessment",
    "Nurse Assessment", "Facility Cleanliness", "Wait Time Feedback", "Telehealth Experience",
    "Prescription Refill", "Insurance Process", "Billing Experience", "Emergency Room Feedback",
    "Outpatient Surgery", "Dental Visit", "Vision Care", "Physical Therapy", "Mental Health Check-in",
    "Dietary Habits", "Exercise Habits", "Sleep Quality", "Pain Management", "Symptom Tracker",
    "Medication Adherence", "Caregiver Feedback", "Home Health Visit", "Hospice Care",
    "Maternity Care", "Pediatric Visit", "Vaccination Feedback", "Lab Test Experience",
    "Imaging/Radiology", "Ambulance Service", "Pharmacy Experience", "Medical Device Usability",
    "Health Seminar Feedback", "Wellness Program", "Employee Health", "Safety Protocol",
    "Visitor Feedback", "Cafeteria (Hospital)", "Parking (Hospital)", "Website (Patient Portal)",
    "Appointment Scheduling", "Referral Experience", "Second Opinion", "Clinical Trial",
    "Patient Education", "Discharge Process", "Follow-up Care", "General Health Assessment"
];

const educationTitles = [
    "Course Evaluation", "Instructor Evaluation", "Student Satisfaction", "Parent Satisfaction",
    "Alumni Survey", "Campus Safety", "Library Services", "Cafeteria Feedback", "Dorm Life",
    "Distance Learning", "Technology Usage", "Extracurricular Activities", "Sports Program",
    "Arts Program", "Study Abroad", "Career Services", "Financial Aid", "Admissions Process",
    "Orientation Feedback", "Graduation Experience", "Curriculum Feedback", "Homework Load",
    "Exam Experience", "Tutor Feedback", "Peer Mentoring", "Student Well-being", "Bullying Report",
    "Teacher Professional Dev", "Staff Satisfaction", "Facilities Maintenance", "Transportation",
    "School Website", "Parent-Teacher Conf", "Volunteer Feedback", "Fundraising Event",
    "School Board Feedback", "District Policy", "Special Education", "Gifted Program", "Summer School",
    "After School Program", "Clubs & Oganizations", "Student Council", "Yearbook Feedback",
    "Field Trip Feedback", "Guest Speaker", "Workshop Feedback", "Research Project", "Internship (Student)",
    "Suggestion Box (Student)"
];

const eventTitles = [
    "Event Satisfaction", "Webinar Feedback", "Conference Feedback", "Workshop Evaluation",
    "Speaker Evaluation", "Venue Feedback", "Catering Feedback", "Networking Value",
    "Registration Process", "App/Website Feedback", "Sponsor Feedback", "Exhibitor Feedback",
    "Volunteer Experience", "Staff Performance", "Security Feedback", "Audio/Visual Quality",
    "Session Content", "Keynote Feedback", "Panel Discussion", "Breakout Session",
    "Entertainment", "Transportation/Shuttle", "Hotel/Accommodation", "Pre-event Comm",
    "Post-event Follow-up", "Ticket Pricing", "Merchandise Feedback", "Social Education",
    "Virtual Event Platform", "Hybrid Experience", "Networking Party", "Gala Dinner",
    "Fundraiser Feedback", "Charity Run", "Music Festival", "Art Exhibition", "Trade Show",
    "Product Launch", "Press Event", "VIP Experience", "Accessibility", "Sustainability",
    "Cleanliness", "WiFi/Connectivity", "Signage/Navigation", "Schedule/Timing",
    "Overall Atmosphere", "Likelihood to Return", "NPS (Event)", "Suggestion Box"
];

const createTemplate = (id, title, category, icon, description, elements) => ({
    id: id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    title,
    category,
    description: description || `Standard template for ${title}`,
    icon,
    definition: {
        title: title,
        pages: [{ name: "page1", elements }]
    }
});

const cxTemplates = cxTitles.map((t, i) => createTemplate(`cx-${i}`, t, "Customer Experience", "❤️", null, [
    { type: "rating", name: "satisfaction", title: "How satisfied are you?", rateMax: 10 },
    { type: "comment", name: "feedback", title: "Any additional feedback?" }
]));

const hrTemplates = hrTitles.map((t, i) => createTemplate(`hr-${i}`, t, "Human Resources", "👥", null, [
    { type: "rating", name: "agreement", title: "I agree with the statement related to " + t, rateMax: 10 },
    { type: "comment", name: "details", title: "Please explain your rating." }
]));

const healthTemplates = healthcareTitles.map((t, i) => createTemplate(`hlth-${i}`, t, "Healthcare", "🏥", null, [
    { type: "radiogroup", name: "quality", title: "Rate the quality of " + t, choices: ["Excellent", "Good", "Fair", "Poor"] },
    { type: "comment", name: "notes", title: "Medical Notes / Feedback" }
]));

const eduTemplates = educationTitles.map((t, i) => createTemplate(`edu-${i}`, t, "Education", "🎓", null, [
    { type: "rating", name: "score", title: "Evaluation Score", rateMax: 10 },
    { type: "text", name: "educator_name", title: "Instructor / Course Name" }
]));

const eventTemplates = eventTitles.map((t, i) => createTemplate(`evt-${i}`, t, "Events", "🎉", null, [
    { type: "rating", name: "rating", title: "Overall Rating", rateMax: 10 },
    { type: "boolean", name: "recommend", title: "Would you recommend this event?" }
]));

export const surveyTemplates = [
    ...cxTemplates,
    ...hrTemplates,
    ...healthTemplates,
    ...eduTemplates,
    ...eventTemplates
];
