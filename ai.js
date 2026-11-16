// src/ai.js
// Intelligent AI Healthcare Assistant for Patients and Hospital Staff
const { db } = require('./db');

// Critical emergency keywords that trigger immediate Red Alert protocol
const EMERGENCY_PATTERNS = [
  { pattern: /(chest pain|heart attack|crushing chest|radiating to (arm|jaw|back)|tightness in chest)/i, condition: 'Suspected Acute Coronary Syndrome / Myocardial Infarction (Heart Attack)' },
  { pattern: /(face droop|arm weakness|slurred speech|stroke|cannot move one side|facial drooping)/i, condition: 'Suspected Acute Stroke (FAST Protocol Alert)' },
  { pattern: /(cannot breathe|severe shortness of breath|gasping|turning blue|lips blue|suffocating)/i, condition: 'Acute Severe Respiratory Failure / Hypoxia' },
  { pattern: /(throat swelling|swollen lips and tongue|anaphylaxis|cannot swallow after bee|peanuts allergy reaction)/i, condition: 'Severe Anaphylactic Shock' },
  { pattern: /(profuse bleeding|arterial bleeding|spurting blood|coughing up cups of blood|vomiting blood)/i, condition: 'Massive Hemorrhage / Active Internal Bleeding' },
  { pattern: /(unconscious|unresponsive|passed out and won't wake up|collapsed and not breathing)/i, condition: 'Unconscious / Suspected Cardiac Arrest' },
  { pattern: /(seizure lasting|status epilepticus|convulsing for 5 minutes)/i, condition: 'Prolonged Seizure Emergency' },
  { pattern: /(drank poison|swallowed bleach|overdose on pills|battery swallowed)/i, condition: 'Acute Toxic Poisoning / Overdose' }
];

// Emergency response builder
function buildEmergencyAlert(condition) {
  return {
    isEmergency: true,
    condition: condition,
    alertTitle: '🚨 IMMEDIATE MEDICAL EMERGENCY DETECTED',
    message: `### ⚠️ CRITICAL SAFETY NOTICE: EMERGENCY ACTION REQUIRED
**Condition Identified:** **${condition}**

Please take the following emergency actions immediately:
1. **CALL EMERGENCY SERVICES NOW**:
   - **Ghana National Emergency**: Dial **112**
   - **National Ambulance Service**: Dial **193**
   - **Accra Ridge Hospital Emergency**: +233 30 222 8315
   - **International Emergency**: Dial **911** or your local country emergency dispatch.
2. **DO NOT DRIVE YOURSELF**: Have someone else drive or wait for the paramedics.
3. **IMMEDIATE FIRST-AID STEPS**:
   - Keep the patient calm, seated, or lying down in a well-ventilated space.
   - Loosen tight clothing around the neck and chest.
   - If cardiac arrest is suspected and patient is unresponsive with no breathing, **start CPR compressions immediately** (100-120 compressions per minute in the center of the chest).
   - If severe bleeding, apply firm continuous direct pressure over the wound.
4. **DO NOT DELAY**: Immediate hospital care can save a life.`,
    actions: [
      { text: 'Call Emergency 112', action: 'tel:112', type: 'danger' },
      { text: 'View First Aid Protocols', action: '#first-aid', type: 'secondary' }
    ]
  };
}

// Search medical knowledge base for matching entries
function searchKnowledge(query) {
  try {
    const terms = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    if (terms.length === 0) return [];

    const rows = db.prepare(`SELECT * FROM medical_knowledge`).all();
    const scored = rows.map(item => {
      let score = 0;
      const combined = `${item.title} ${item.summary} ${item.keywords} ${item.content}`.toLowerCase();
      for (const term of terms) {
        if (item.title.toLowerCase().includes(term)) score += 10;
        if (item.keywords && item.keywords.toLowerCase().includes(term)) score += 6;
        if (item.summary.toLowerCase().includes(term)) score += 3;
        if (item.content.toLowerCase().includes(term)) score += 1;
      }
      return { item, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map(x => x.item);
  } catch (err) {
    console.error('Knowledge search error:', err.message);
    return [];
  }
}

// Generate intelligent contextual response
async function generateHealthcareResponse({ message, userRole = 'patient', userName = 'User', context = {} }) {
  const cleanMsg = (message || '').trim();

  // 1. Check for immediate medical red flags
  for (const { pattern, condition } of EMERGENCY_PATTERNS) {
    if (pattern.test(cleanMsg)) {
      return buildEmergencyAlert(condition);
    }
  }

  // 2. Query knowledge base
  const matches = searchKnowledge(cleanMsg);

  // 3. Optional Gemini API integration if GEMINI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the specialized AI Healthcare Assistant in the Hospital Management System (HMS).
The current user is ${userName} with role: ${userRole}.
Role Mode: ${userRole === 'patient' ? 'PATIENT MODE (warm, clear, layperson friendly, explaining symptoms and first aid, never prescribing or replacing doctors)' : 'STAFF/CLINICAL MODE (clinical reference, pharmacology, standard nursing procedures, ICD-10 coding, hospital SOPs)'}.

CRITICAL MEDICAL SAFETY RULES:
- Never issue definitive prescriptions or independently diagnose.
- Always include guidance to consult a physician for personalized care.
- For emergency symptoms, instruct them to call 112/911 immediately.
- Relevant Hospital Knowledge: ${JSON.stringify(matches)}

User query: "${cleanMsg}"`
            }]
          }]
        })
      });
      if (response.ok) {
        const data = await response.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
          return {
            isEmergency: false,
            message: aiText,
            knowledgeMatches: matches,
            disclaimer: 'Antigravity HMS AI provides educational and clinical guidance only. It does not replace clinical evaluation by a licensed healthcare practitioner.'
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local clinical knowledge engine:', err.message);
    }
  }

  // 4. Built-in Clinical Intelligence and Role-Based Reasoning Engine
  let responseText = '';
  const q = cleanMsg.toLowerCase();

  // A. Handling Appointments & Hospital Navigation
  if (q.includes('book') || q.includes('appointment') || q.includes('schedule') || q.includes('see a doctor')) {
    if (userRole === 'patient') {
      responseText = `### 📅 How to Book an Appointment
I can help guide you through booking a consultation with our hospital specialists:

1. **Choose Consultation Type**:
   - **In-Person Consultation**: Visit our modern clinic facilities at Airport Residential / East Legon, Accra.
   - **Virtual Telemedicine**: Connect via secure video call from home.
2. **Select Department & Specialist**:
   - **Cardiology**: Dr. Kwesi Mensah (Consultant Cardiologist)
   - **Pediatrics**: Dr. Akosua Boateng (Child Health Specialist)
   - **Orthopedic & Surgery**: Dr. David Appiah
3. **Select Date & Available Time Slot**:
   - Use our **Book Appointment** tab in your Patient Dashboard.
   - Choose your preferred morning or afternoon slot.

Would you like me to take you directly to the **Appointment Booking** section?`;
      return {
        isEmergency: false,
        message: responseText,
        actions: [{ text: 'Go to Book Appointment', action: '#appointments', type: 'primary' }],
        disclaimer: 'Appointments are subject to doctor schedule availability and confirmation.'
      };
    } else {
      responseText = `### 📋 Appointment Management System (Staff View)
As hospital staff, you can view the complete clinical schedule:
- **Doctor Consultation Hours**: Mon - Fri, 08:00 AM - 04:00 PM.
- **Reception / Scheduling**: Check the **Appointments tab** to approve, decline, or reschedule patient requests.
- **Virtual Consultations**: Accessible directly through the Doctor Dashboard with integrated telemedicine note-taking.`;
      return {
        isEmergency: false,
        message: responseText,
        actions: [{ text: 'View Appointments Queue', action: '#appointments', type: 'primary' }],
        disclaimer: 'System adheres to Hospital Patient Scheduling Protocol.'
      };
    }
  }

  // B. Specific Knowledge Base Matches
  if (matches.length > 0) {
    const top = matches[0];
    if (userRole === 'patient') {
      responseText = `### 🩺 Healthcare Information: ${top.title}

${top.summary}

**Key Details & Guidance:**
${top.content}

---
**When to Seek Professional Medical Care:**
- If your symptoms worsen, persist beyond 48 hours, or fail to respond to standard measures.
- If you develop high fever, severe pain, breathing difficulty, or persistent vomiting.
- Always consult your doctor or clinical specialist for an individualized diagnostic workup.`;
    } else {
      // Staff view: includes clinical terminology, ICD codes, and protocol
      responseText = `### 🏥 Clinical Reference: ${top.title} [Category: ${top.category.toUpperCase()}]
**Summary:** ${top.summary}

**Clinical Protocol & Information:**
${top.content}

**Staff Action Items:**
- Verify patient identification and cross-check allergy profile in EMR before ordering medications.
- Document all vital signs in the Nurse observation log.
- Follow Ghanaian Health Service & WHO standard clinical practice guidelines.`;
    }

    return {
      isEmergency: false,
      message: responseText,
      knowledgeMatches: matches,
      disclaimer: 'Information provided for educational and clinical reference. Prescriptions and medical interventions require physician authorization.'
    };
  }

  // C. Medical Terminology & Lab Tests Explanation
  if (q.includes('fbc') || q.includes('cbc') || q.includes('blood count')) {
    responseText = `### 🔬 Full Blood Count (FBC / CBC) Explanation
A **Full Blood Count** is a fundamental laboratory blood test that evaluates your overall health and detects a wide range of disorders:

- **White Blood Cells (WBC)**: Normal range **4.0 - 10.0 x10^9/L**. High levels indicate infection, inflammation, or immune response.
- **Hemoglobin (Hb)**: Normal range **12.0 - 16.0 g/dL** (Females: 12-15 g/dL, Males: 13.5-17.5 g/dL). Low values indicate anemia.
- **Platelets (PLT)**: Normal range **150 - 450 x10^9/L**. Crucial for blood clotting and stopping bleeding.
- **Red Blood Cells (RBC) & Hematocrit**: Measure oxygen carrying capacity.

*You can view your verified lab test results directly in the Laboratory Reports section.*`;
    return {
      isEmergency: false,
      message: responseText,
      actions: [{ text: 'View Lab Results', action: '#emr', type: 'secondary' }],
      disclaimer: 'Lab values must always be interpreted in the context of the patient\'s clinical presentation by a qualified doctor.'
    };
  }

  if (q.includes('vital') || q.includes('blood pressure') || q.includes('bp') || q.includes('spo2') || q.includes('temperature')) {
    responseText = `### 📊 Vital Signs Normal Adult Reference Ranges
- **Blood Pressure (BP)**: Normal is **< 120/80 mmHg**. Elevated: 120-129/<80. Hypertension Stage 1: 130-139 / 80-89. Stage 2: >= 140/90.
- **Body Temperature**: Normal range is **36.5°C to 37.5°C** (97.7°F - 99.5°F). Fever is defined as >= 38.0°C (100.4°F).
- **Pulse / Heart Rate**: Normal resting rate is **60 to 100 beats per minute (bpm)**.
- **Respiratory Rate**: Normal adult rate is **12 to 20 breaths per minute**.
- **Oxygen Saturation (SpO2)**: Normal is **95% to 100%** on room air. Levels below 92% warrant prompt medical evaluation.
- **Fasting Blood Glucose**: Normal is **3.9 to 5.6 mmol/L** (70 - 100 mg/dL).`;
    return {
      isEmergency: false,
      message: responseText,
      disclaimer: 'Vital signs vary by age, physical conditioning, and medical history. Nurses record and track vitals in the Vitals Log.'
    };
  }

  // D. General Fallback
  if (userRole === 'patient') {
    responseText = `Hello **${userName}**! I am your **AI Healthcare Assistant**.

I can assist you with:
1. **Understanding Symptoms & Common Illnesses** (e.g. Malaria, Hypertension, Asthma, Fever, Cough, Headaches).
2. **First-Aid Protocols** (e.g. Burns, Choking, Sprains, Bleeding, CPR).
3. **Medication Information** (uses, precautions, common side effects of hospital medications).
4. **Lab Results & Medical Terms** (explaining FBC, Lipid Profile, BP numbers in simple language).
5. **Hospital Services & Booking** (scheduling consultations with Dr. Mensah, Dr. Boateng, or Dr. Appiah).

*How may I help you feel better today? You can type your symptom, drug name, or question below.*`;
  } else {
    responseText = `Welcome, **${userName}** (${userRole.toUpperCase()}) to the **Clinical AI Assistant**.

I am configured in **Staff & Clinical Reference Mode**:
- **Diagnostic & ICD-10 Reference**: Search standard clinical classifications and disease criteria.
- **Pharmacology & Drug Formularies**: Dosages, contraindications, and drug-drug interactions.
- **Nursing Care & Triage SOPs**: Vitals interpretation, triage scoring, catheter care, infusion rate formulas.
- **Hospital Documentation**: Guidance on creating clinical notes, EMR updates, and laboratory orders.
- **Ghanaian Act 843 Compliance**: Data privacy guidelines for electronic health records.

*Please enter the medical topic, clinical procedure, or hospital workflow you wish to review.*`;
  }

  return {
    isEmergency: false,
    message: responseText,
    disclaimer: 'Antigravity HMS AI Assistant is a digital educational tool and clinical reference aid. It does not replace physician clinical judgment.'
  };
}

module.exports = {
  generateHealthcareResponse,
  buildEmergencyAlert,
  searchKnowledge
};
