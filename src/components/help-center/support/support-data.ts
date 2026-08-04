import type { ComponentType } from "react";
import {
  MessageSquare, Mail, Phone, Video, Calendar,
  TicketIcon, Bug, Lightbulb, Star, Users,
  ShieldAlert, Zap, HeadphonesIcon, ShieldCheck,
  Wind, Droplets, Flame, Trash2, FlaskConical, Bird,
  MessageCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketStatus   = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type BugSeverity    = "minor" | "major" | "critical" | "blocker";
export type FeatureStatus  = "submitted" | "planned" | "in_progress" | "shipped" | "declined";

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedTeam: string;
  department: string;
  environment: string;
  estimatedResponse: string;
  description: string;
  tags: string[];
}

export interface AuthorityCard {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  altPhone?: string;
  website?: string;
  address?: string;
  serviceArea: string;
  jurisdiction?: string;
  services?: string[];
  level: "national" | "state" | "district";
  category: string;
  availability: "available" | "busy" | "offline";
  officeHours: string;
  responseTime: string;
  lat?: number;
  lng?: number;
  lastVerified?: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: FeatureStatus;
  votes: number;
  submittedAt: string;
  estimatedRelease?: string;
  tags: string[];
}

export interface ContactMethod {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
  comingSoon?: boolean;
  badge?: string;
  accentColor: string;
  action: string;
  availability: string;
  responseTime: string;
}

export interface EmergencyType {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  level: "critical" | "high" | "medium";
  number: string;
  accentColor: string;
  protocol: string;
}

// ─── Status / priority styling ────────────────────────────────────────────────

export const TICKET_STATUS_STYLE: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "var(--color-info)",            bg: "color-mix(in oklab, var(--color-info) 12%, transparent)"        },
  in_progress: { label: "In Progress", color: "var(--color-warning)",         bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)"     },
  waiting:     { label: "Waiting",     color: "var(--color-muted-foreground)", bg: "var(--color-muted)"                                            },
  resolved:    { label: "Resolved",    color: "var(--color-success)",         bg: "color-mix(in oklab, var(--color-success) 12%, transparent)"     },
  closed:      { label: "Closed",      color: "var(--color-muted-foreground)", bg: "var(--color-muted)"                                            },
};

export const TICKET_PRIORITY_STYLE: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: "Low",      color: "var(--color-muted-foreground)" },
  medium:   { label: "Medium",   color: "var(--color-info)"             },
  high:     { label: "High",     color: "var(--color-warning)"          },
  critical: { label: "Critical", color: "var(--color-destructive)"      },
};

export const BUG_SEVERITY_STYLE: Record<BugSeverity, { label: string; color: string }> = {
  minor:    { label: "Minor",    color: "var(--color-muted-foreground)" },
  major:    { label: "Major",    color: "var(--color-warning)"          },
  critical: { label: "Critical", color: "var(--color-destructive)"      },
  blocker:  { label: "Blocker",  color: "var(--color-destructive)"      },
};

export const FEATURE_STATUS_STYLE: Record<FeatureStatus, { label: string; color: string }> = {
  submitted:   { label: "Submitted",   color: "var(--color-muted-foreground)" },
  planned:     { label: "Planned",     color: "var(--color-info)"             },
  in_progress: { label: "In Progress", color: "var(--color-warning)"          },
  shipped:     { label: "Shipped",     color: "var(--color-success)"          },
  declined:    { label: "Declined",    color: "var(--color-destructive)"      },
};

// ─── Contact methods ──────────────────────────────────────────────────────────

export const CONTACT_METHODS: ContactMethod[] = [
  {
    id: "ticket",
    label: "Support Ticket",
    description: "Create a tracked request with full audit trail and guaranteed SLA response",
    icon: TicketIcon,
    available: true,
    badge: "Recommended",
    accentColor: "var(--color-primary)",
    action: "Create Ticket",
    availability: "24/7",
    responseTime: "< 4 hours",
  },
  {
    id: "email",
    label: "Email Support",
    description: "Send a detailed message and receive a thorough written response",
    icon: Mail,
    available: true,
    accentColor: "var(--color-info)",
    action: "Send Email",
    availability: "Mon–Fri 9am–6pm",
    responseTime: "< 8 hours",
  },
  {
    id: "phone",
    label: "Phone Support",
    description: "Speak directly with a platform specialist for immediate guidance",
    icon: Phone,
    available: true,
    accentColor: "var(--color-success)",
    action: "Call Now",
    availability: "Mon–Fri 8am–8pm",
    responseTime: "Immediate",
  },
  {
    id: "callback",
    label: "Schedule Callback",
    description: "Book a convenient time and a specialist will call you back",
    icon: Calendar,
    available: true,
    accentColor: "var(--color-warning)",
    action: "Book Callback",
    availability: "Mon–Fri 9am–5pm",
    responseTime: "At scheduled time",
  },
  {
    id: "live-chat",
    label: "Live Chat",
    description: "Real-time chat with support agents or authority coordinators",
    icon: MessageSquare,
    available: false,
    comingSoon: true,
    accentColor: "var(--color-primary)",
    action: "Start Chat",
    availability: "24/7 (coming soon)",
    responseTime: "< 2 min",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Connect via WhatsApp for quick questions and status updates",
    icon: MessageCircle,
    available: false,
    comingSoon: true,
    accentColor: "var(--color-success)",
    action: "Open WhatsApp",
    availability: "Coming soon",
    responseTime: "< 1 hour",
  },
];

// ─── Emergency types ──────────────────────────────────────────────────────────

export const EMERGENCY_TYPES: EmergencyType[] = [
  {
    id: "national-emergency",
    label: "National Emergency Number",
    description: "Single emergency number for police, fire, ambulance, and disaster response across India",
    icon: ShieldAlert,
    level: "critical",
    number: "112",
    accentColor: "var(--color-destructive)",
    protocol: "Call 112 immediately — dispatches police, fire, or ambulance as needed",
  },
  {
    id: "air-pollution",
    label: "Air Pollution Emergency",
    description: "Hazardous AQI levels, industrial gas leaks, or toxic air contamination — report to CPCB or KSPCB",
    icon: Wind,
    level: "critical",
    number: "1800-11-4000",
    accentColor: "var(--color-destructive)",
    protocol: "Evacuate the affected area, avoid outdoor exposure, report exact location to CPCB helpline",
  },
  {
    id: "fire-emergency",
    label: "Fire & Smoke Emergency",
    description: "Industrial fires, wildfires, or uncontrolled burns producing toxic smoke in Karnataka",
    icon: Flame,
    level: "critical",
    number: "101",
    accentColor: "var(--color-warning)",
    protocol: "Call 101 (Fire Services) immediately. Also contact Karnataka Fire & Emergency Services",
  },
  {
    id: "water-pollution",
    label: "Water Pollution / Contamination",
    description: "Illegal discharge into rivers, contaminated water supply, or chemical spills near water bodies",
    icon: Droplets,
    level: "critical",
    number: "1800-425-0034",
    accentColor: "var(--color-info)",
    protocol: "Do not consume water from affected source. Report to KSPCB Belagavi Regional Office",
  },
  {
    id: "chemical-spill",
    label: "Chemical / Industrial Spill",
    description: "Release of hazardous chemicals, industrial solvents, or toxic substances in or around Belagavi",
    icon: FlaskConical,
    level: "critical",
    number: "112",
    accentColor: "var(--color-destructive)",
    protocol: "Clear the area immediately. Call 112 for HAZMAT response. Do not attempt cleanup",
  },
  {
    id: "illegal-dumping",
    label: "Illegal Dumping & Waste",
    description: "Illegal disposal of industrial waste, hazardous materials, or large-scale dumping in protected areas",
    icon: Trash2,
    level: "high",
    number: "0831-2403800",
    accentColor: "var(--color-warning)",
    protocol: "Photograph evidence if safe to do so. Do not touch materials. Report to Belagavi City Corporation",
  },
  {
    id: "wildlife-emergency",
    label: "Wildlife Emergency",
    description: "Injured protected wildlife, poaching, habitat destruction, or human-wildlife conflict near Belagavi",
    icon: Bird,
    level: "medium",
    number: "1926",
    accentColor: "var(--color-success)",
    protocol: "Do not approach the animal. Call Karnataka Forest Department helpline 1926. Document with photos",
  },
  {
    id: "ambulance",
    label: "Medical Emergency",
    description: "Environmental illness, chemical exposure, or health emergency related to pollution or disaster",
    icon: ShieldCheck,
    level: "critical",
    number: "108",
    accentColor: "var(--color-info)",
    protocol: "Call 108 for free ambulance service across Karnataka. Available 24/7",
  },
];

// ─── Mock tickets ─────────────────────────────────────────────────────────────

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "TKT-2041",
    subject: "Dashboard AQI widget not updating after sensor replacement",
    category: "Technical Issue",
    status: "in_progress",
    priority: "high",
    createdAt: "2 hours ago",
    updatedAt: "30 min ago",
    assignedTeam: "Platform Engineering",
    department: "Environmental Monitoring",
    environment: "Production",
    estimatedResponse: "Within 2 hours",
    description: "The AQI overview widget stopped refreshing after we replaced Sensor S-142.",
    tags: ["dashboard", "sensors", "AQI"],
  },
  {
    id: "TKT-2038",
    subject: "Cannot export enforcement report to XLSX format",
    category: "Bug Report",
    status: "open",
    priority: "medium",
    createdAt: "1 day ago",
    updatedAt: "1 day ago",
    assignedTeam: "Reports Team",
    department: "Reports & Exports",
    environment: "Production",
    estimatedResponse: "Within 4 hours",
    description: "XLSX export produces empty file. PDF works fine.",
    tags: ["reports", "export", "xlsx"],
  },
  {
    id: "TKT-2031",
    subject: "Request access to District 4 complaint management",
    category: "Access Request",
    status: "waiting",
    priority: "low",
    createdAt: "3 days ago",
    updatedAt: "2 days ago",
    assignedTeam: "Administrator",
    department: "Platform Administration",
    environment: "Production",
    estimatedResponse: "Within 24 hours",
    description: "Need permission to manage complaints in District 4 following restructure.",
    tags: ["access", "permissions", "authority"],
  },
  {
    id: "TKT-2019",
    subject: "Smart Map hazard layer missing wildfire data for July",
    category: "Data Issue",
    status: "resolved",
    priority: "high",
    createdAt: "1 week ago",
    updatedAt: "4 days ago",
    assignedTeam: "Data Operations",
    department: "Smart Maps",
    environment: "Production",
    estimatedResponse: "Resolved",
    description: "Wildfire risk layer not displaying July data. Fixed — delayed satellite feed.",
    tags: ["maps", "wildfire", "data"],
  },
  {
    id: "TKT-2005",
    subject: "AI Copilot daily brief fails for custom district scope",
    category: "Technical Issue",
    status: "closed",
    priority: "medium",
    createdAt: "2 weeks ago",
    updatedAt: "1 week ago",
    assignedTeam: "AI Team",
    department: "AI Copilot",
    environment: "Production",
    estimatedResponse: "Resolved",
    description: "Fixed in v2.3.8 — multi-district brief scope now supported.",
    tags: ["AI", "copilot", "brief"],
  },
];

// ─── Authority directory ──────────────────────────────────────────────────────

export const AUTHORITY_DIRECTORY: AuthorityCard[] = [

  // ── National Authorities ────────────────────────────────────────────────────

  {
    id: "cpcb",
    name: "Central Pollution Control Board",
    department: "Ministry of Environment, Forest and Climate Change",
    role: "National Regulatory Authority — Air & Water Quality",
    email: "cpcb@cpcb.nic.in",
    phone: "011-43102030",
    altPhone: "1800-11-4000",
    website: "https://cpcb.nic.in",
    address: "Parivesh Bhawan, East Arjun Nagar, Shahdara, Delhi – 110032",
    serviceArea: "Pan-India",
    jurisdiction: "All Union Territories and States",
    services: [
      "Environmental standards & norms",
      "Air & water quality monitoring",
      "Hazardous waste management",
      "Environmental compliance",
      "PRANA portal for AQI data",
    ],
    level: "national",
    category: "Pollution Control",
    availability: "available",
    officeHours: "Mon–Fri 9:30am–6pm IST",
    responseTime: "2–5 business days",
    lat: 28.6792,
    lng: 77.2953,
    lastVerified: "June 2025",
  },
  {
    id: "moefcc",
    name: "Ministry of Environment, Forest & Climate Change",
    department: "Government of India",
    role: "Central Government Ministry",
    email: "secy-moef@nic.in",
    phone: "011-24695398",
    altPhone: "011-24695377",
    website: "https://moef.gov.in",
    address: "Indira Paryavaran Bhawan, Jor Bagh Road, New Delhi – 110003",
    serviceArea: "Pan-India",
    jurisdiction: "All Union Territories and States",
    services: [
      "Environmental policy & legislation",
      "Forest clearances",
      "Wildlife protection",
      "Climate change action plans",
      "Environmental Impact Assessment",
    ],
    level: "national",
    category: "Environment & Forest",
    availability: "available",
    officeHours: "Mon–Fri 9am–5:30pm IST",
    responseTime: "5–10 business days",
    lat: 28.5934,
    lng: 77.2080,
    lastVerified: "June 2025",
  },
  {
    id: "ndma",
    name: "National Disaster Management Authority",
    department: "Government of India",
    role: "National Authority for Disaster Management",
    email: "ndma-ind@nic.in",
    phone: "011-26701700",
    altPhone: "011-26701728",
    website: "https://ndma.gov.in",
    address: "NDMA Bhawan, A-1, Safdarjung Enclave, New Delhi – 110029",
    serviceArea: "Pan-India",
    jurisdiction: "All Union Territories and States",
    services: [
      "Disaster risk reduction",
      "Emergency response coordination",
      "National disaster guidelines",
      "Capacity building for disaster response",
      "Mitigation & preparedness policies",
    ],
    level: "national",
    category: "Disaster Management",
    availability: "available",
    officeHours: "24/7 (Emergency Operations Centre)",
    responseTime: "Immediate (emergency)",
    lat: 28.5679,
    lng: 77.1878,
    lastVerified: "June 2025",
  },
  {
    id: "ngt",
    name: "National Green Tribunal",
    department: "Judiciary — Government of India",
    role: "Quasi-Judicial Environmental Authority",
    email: "registrar-ngt@nic.in",
    phone: "011-24300891",
    altPhone: "011-24300892",
    website: "https://greentribunal.gov.in",
    address: "Faridkot House, Copernicus Marg, New Delhi – 110001",
    serviceArea: "Pan-India",
    jurisdiction: "All environmental matters across India",
    services: [
      "Environmental dispute resolution",
      "Orders on pollution violations",
      "Public interest environmental cases",
      "Compensation for environmental damage",
    ],
    level: "national",
    category: "Environmental Judiciary",
    availability: "available",
    officeHours: "Mon–Fri 10am–5pm IST (Court sessions)",
    responseTime: "As per court schedule",
    lat: 28.6271,
    lng: 77.2218,
    lastVerified: "June 2025",
  },

  // ── Karnataka State Authorities ──────────────────────────────────────────────

  {
    id: "kspcb",
    name: "Karnataka State Pollution Control Board",
    department: "Government of Karnataka",
    role: "State Regulatory Authority — Pollution Control",
    email: "chairman@kspcb.gov.in",
    phone: "080-25589112",
    altPhone: "080-25589113",
    website: "https://kspcb.karnataka.gov.in",
    address: "Parisara Bhavan, No. 49, Church Street, Bengaluru – 560001",
    serviceArea: "Karnataka",
    jurisdiction: "All 31 districts of Karnataka",
    services: [
      "Consent to Establish & Operate (industries)",
      "Air & water quality monitoring",
      "Effluent & emission standards",
      "Hazardous waste authorisation",
      "Environmental complaints — industries",
    ],
    level: "state",
    category: "Pollution Control",
    availability: "available",
    officeHours: "Mon–Sat 10am–5:30pm IST",
    responseTime: "1–3 business days",
    lat: 12.9766,
    lng: 77.6082,
    lastVerified: "June 2025",
  },
  {
    id: "kspcb-belagavi",
    name: "KSPCB — Belagavi Regional Office",
    department: "Karnataka State Pollution Control Board",
    role: "Regional Environmental Officer",
    email: "reo.belagavi@kspcb.gov.in",
    phone: "0831-2421273",
    website: "https://kspcb.karnataka.gov.in",
    address: "Regional Office, KSPCB, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi Division",
    jurisdiction: "Belagavi, Bagalkot, Vijayapura, Dharwad, Gadag districts",
    services: [
      "Local industrial pollution complaints",
      "Water quality monitoring — Belagavi region",
      "Consent management for local industries",
      "Field inspection & enforcement",
    ],
    level: "state",
    category: "Pollution Control",
    availability: "available",
    officeHours: "Mon–Sat 10am–5:30pm IST",
    responseTime: "1–2 business days",
    lat: 15.8497,
    lng: 74.4977,
    lastVerified: "June 2025",
  },
  {
    id: "ksdma",
    name: "Karnataka State Disaster Management Authority",
    department: "Government of Karnataka — Revenue Department",
    role: "State Authority for Disaster Management",
    email: "ksdma@karnataka.gov.in",
    phone: "080-22340676",
    altPhone: "1070",
    website: "https://ksdma.karnataka.gov.in",
    address: "KSRSAC Building, No. 1, Dr. M H Marigowda Road, Bengaluru – 560029",
    serviceArea: "Karnataka",
    jurisdiction: "All 31 districts of Karnataka",
    services: [
      "State disaster response coordination",
      "SDRF deployment",
      "Early warning systems",
      "Disaster relief & rehabilitation",
      "State Emergency Operations Centre (SEOC)",
    ],
    level: "state",
    category: "Disaster Management",
    availability: "available",
    officeHours: "24/7 (SEOC operational round the clock)",
    responseTime: "Immediate (emergency)",
    lat: 12.9342,
    lng: 77.5856,
    lastVerified: "June 2025",
  },
  {
    id: "karnataka-forest",
    name: "Karnataka Forest Department",
    department: "Government of Karnataka",
    role: "Principal Chief Conservator of Forests",
    email: "pccf@aranya.gov.in",
    phone: "080-22868084",
    altPhone: "1926",
    website: "https://aranya.gov.in",
    address: "Aranya Bhavan, 18th Cross, Malleshwaram, Bengaluru – 560003",
    serviceArea: "Karnataka",
    jurisdiction: "All forest areas and wildlife sanctuaries in Karnataka",
    services: [
      "Wildlife protection & anti-poaching",
      "Forest conservation & management",
      "Human-wildlife conflict response (1926)",
      "Eco-tourism management",
      "Tree felling permissions",
    ],
    level: "state",
    category: "Forest & Wildlife",
    availability: "available",
    officeHours: "Mon–Sat 10am–5:30pm IST",
    responseTime: "Same day (wildlife emergency via 1926)",
    lat: 13.0072,
    lng: 77.5712,
    lastVerified: "June 2025",
  },
  {
    id: "karnataka-fire",
    name: "Karnataka Fire and Emergency Services",
    department: "Government of Karnataka — Home Department",
    role: "Director General — Fire & Emergency Services",
    email: "dgfes.kar@gmail.com",
    phone: "101",
    altPhone: "080-22282500",
    website: "https://karnatakafire.gov.in",
    address: "Fire Services HQ, Infantry Road, Bengaluru – 560001",
    serviceArea: "Karnataka",
    jurisdiction: "All districts of Karnataka",
    services: [
      "Fire suppression & rescue",
      "Industrial fire response",
      "Chemical incident response",
      "Flood & disaster rescue",
      "Emergency hazmat operations",
    ],
    level: "state",
    category: "Fire & Emergency",
    availability: "available",
    officeHours: "24/7",
    responseTime: "Immediate",
    lat: 12.9793,
    lng: 77.5968,
    lastVerified: "June 2025",
  },

  // ── Belagavi District Authorities ────────────────────────────────────────────

  {
    id: "belagavi-dc",
    name: "Deputy Commissioner Office, Belagavi",
    department: "Government of Karnataka — District Administration",
    role: "Deputy Commissioner (DC), Belagavi",
    email: "dc.belagavi@karnataka.gov.in",
    phone: "0831-2404040",
    altPhone: "0831-2404041",
    website: "https://belagavi.nic.in",
    address: "DC Office, Club Road, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi District",
    jurisdiction: "Belagavi district — all 5 talukas",
    services: [
      "District-level disaster coordination",
      "Revenue & land administration",
      "Public grievance redressal",
      "Environmental clearances (district level)",
      "Pollution complaint escalation",
    ],
    level: "district",
    category: "District Administration",
    availability: "available",
    officeHours: "Mon–Sat 10am–5:30pm IST",
    responseTime: "2–3 business days",
    lat: 15.8497,
    lng: 74.4977,
    lastVerified: "June 2025",
  },
  {
    id: "belagavi-ddma",
    name: "Belagavi District Disaster Management Authority",
    department: "District Administration, Belagavi",
    role: "District Collector & CEO — DDMA",
    email: "ddma.belagavi@karnataka.gov.in",
    phone: "0831-2404040",
    altPhone: "1077",
    website: "https://belagavi.nic.in",
    address: "DC Office, Club Road, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi District",
    jurisdiction: "Belagavi district — all talukas and gram panchayats",
    services: [
      "District disaster response",
      "Flood & drought relief coordination",
      "DDMA helpline (1077)",
      "Local emergency evacuation",
      "Relief camp management",
    ],
    level: "district",
    category: "Disaster Management",
    availability: "available",
    officeHours: "24/7 during disasters; Mon–Sat 10am–5:30pm otherwise",
    responseTime: "Immediate (disaster); 1 business day (general)",
    lat: 15.8497,
    lng: 74.4977,
    lastVerified: "June 2025",
  },
  {
    id: "belagavi-bcc",
    name: "Belagavi City Corporation (BCC)",
    department: "Urban Local Body — Government of Karnataka",
    role: "Commissioner, Belagavi City Corporation",
    email: "commissioner.bcc@karnataka.gov.in",
    phone: "0831-2403800",
    altPhone: "0831-2403801",
    website: "https://bcc.gov.in",
    address: "BCC Office, Havelock Road, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi City",
    jurisdiction: "Belagavi city municipal limits",
    services: [
      "Solid waste management",
      "Illegal dumping complaints",
      "Urban sanitation",
      "Building & town planning",
      "Local environmental grievances",
    ],
    level: "district",
    category: "Urban Administration",
    availability: "available",
    officeHours: "Mon–Sat 10am–5:30pm IST",
    responseTime: "1–3 business days",
    lat: 15.8586,
    lng: 74.5074,
    lastVerified: "June 2025",
  },
  {
    id: "belagavi-fire",
    name: "Belagavi District Fire Office",
    department: "Karnataka Fire and Emergency Services",
    role: "District Fire Officer, Belagavi",
    email: "dfo.belagavi@karnatakafire.gov.in",
    phone: "101",
    altPhone: "0831-2421222",
    website: "https://karnatakafire.gov.in",
    address: "Fire Station, Shahapur Road, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi District",
    jurisdiction: "Belagavi district",
    services: [
      "Fire & rescue operations",
      "Industrial fire response",
      "Road accident rescue",
      "Flood rescue",
      "Chemical incident first response",
    ],
    level: "district",
    category: "Fire & Emergency",
    availability: "available",
    officeHours: "24/7",
    responseTime: "Immediate",
    lat: 15.8505,
    lng: 74.4951,
    lastVerified: "June 2025",
  },
  {
    id: "belagavi-health",
    name: "District Health Office, Belagavi",
    department: "Department of Health & Family Welfare — Karnataka",
    role: "District Health & Family Welfare Officer (DHFWO)",
    email: "dhfwo.belagavi@karnataka.gov.in",
    phone: "0831-2421100",
    altPhone: "108",
    website: "https://health.kar.nic.in",
    address: "District Health Office, K.B. Cross, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi District",
    jurisdiction: "Belagavi district — all PHCs and CHCs",
    services: [
      "Public health emergency response",
      "Disease outbreak management",
      "Pollution-related health advisories",
      "108 ambulance coordination",
      "Environmental health inspections",
    ],
    level: "district",
    category: "Public Health",
    availability: "available",
    officeHours: "Mon–Sat 9am–5pm IST (Emergency: 24/7)",
    responseTime: "Same day (health emergency)",
    lat: 15.8497,
    lng: 74.4977,
    lastVerified: "June 2025",
  },
  {
    id: "belagavi-police",
    name: "Belagavi City Police Control Room",
    department: "Karnataka Police",
    role: "City Police Commissioner, Belagavi",
    email: "cpbelagavi@ksp.gov.in",
    phone: "100",
    altPhone: "0831-2421100",
    website: "https://ksp.gov.in",
    address: "Belagavi City Police Commissioner Office, Belagavi – 590001, Karnataka",
    serviceArea: "Belagavi City & District",
    jurisdiction: "Belagavi city and district limits",
    services: [
      "Law enforcement",
      "Environmental crime reporting",
      "Illegal industrial activity",
      "Wildlife poaching reports",
      "Emergency response coordination",
    ],
    level: "district",
    category: "Law Enforcement",
    availability: "available",
    officeHours: "24/7",
    responseTime: "Immediate",
    lat: 15.8500,
    lng: 74.4960,
    lastVerified: "June 2025",
  },
];

// ─── Feature requests ─────────────────────────────────────────────────────────

export const FEATURE_REQUESTS: FeatureRequest[] = [
  {
    id: "fr-001",
    title: "Dark mode for the mobile app",
    description: "Allow users to switch to a dark theme on the mobile interface to reduce eye strain and improve battery life on OLED displays.",
    category: "UI/UX",
    status: "planned",
    votes: 428,
    submittedAt: "3 months ago",
    estimatedRelease: "Q3 2026",
    tags: ["mobile", "dark mode", "accessibility"],
  },
  {
    id: "fr-002",
    title: "Bulk complaint status updates for authority users",
    description: "Allow authority officers to select multiple complaints and update status or assign them in a single action.",
    category: "Authority Portal",
    status: "in_progress",
    votes: 312,
    submittedAt: "2 months ago",
    estimatedRelease: "Q2 2026",
    tags: ["authority", "complaints", "productivity"],
  },
  {
    id: "fr-003",
    title: "Webhook support for alert notifications",
    description: "Configure webhook endpoints for real-time alert payloads — Slack, Teams, PagerDuty, and custom systems.",
    category: "Integrations",
    status: "planned",
    votes: 287,
    submittedAt: "6 weeks ago",
    estimatedRelease: "Q4 2026",
    tags: ["webhooks", "integrations", "alerts"],
  },
  {
    id: "fr-004",
    title: "PDF report with custom branding / logo",
    description: "Add municipality logo and colour scheme to exported PDF reports for official regulatory submissions.",
    category: "Reports",
    status: "shipped",
    votes: 264,
    submittedAt: "4 months ago",
    estimatedRelease: "v2.3",
    tags: ["reports", "branding", "PDF"],
  },
  {
    id: "fr-005",
    title: "AI Copilot conversation history and saved queries",
    description: "Save AI Copilot sessions so users can revisit previous analyses without re-running queries.",
    category: "AI Copilot",
    status: "submitted",
    votes: 198,
    submittedAt: "3 weeks ago",
    tags: ["AI", "copilot", "history"],
  },
  {
    id: "fr-006",
    title: "Offline mode for field officers",
    description: "Allow field officers to view complaint data and submit updates while offline, syncing on reconnect.",
    category: "Mobile",
    status: "submitted",
    votes: 156,
    submittedAt: "2 weeks ago",
    tags: ["mobile", "offline", "authority"],
  },
];

// ─── Support analytics ────────────────────────────────────────────────────────

export const SUPPORT_ANALYTICS = {
  openTickets:       3,
  resolvedThisMonth: 12,
  avgResponseTime:   "2.4h",
  satisfactionScore: 4.7,
  totalTickets:      17,
  resolutionRate:    "94%",
  pendingRequests:   2,
};

// ─── Form option arrays ───────────────────────────────────────────────────────

export const SUPPORT_CATEGORIES = [
  "Technical Issue",
  "Access Request",
  "Bug Report",
  "Data Issue",
  "Account & Billing",
  "Feature Request",
  "Complaint Management",
  "Sensor & Hardware",
  "Reports & Exports",
  "AI Copilot",
  "Other",
];

export const DEPARTMENTS = [
  "Environmental Monitoring",
  "Smart Maps",
  "AI Copilot",
  "Reports & Exports",
  "Platform Administration",
  "Authority Portal",
  "Citizen Portal",
  "Security & Access",
  "Sensor Network",
  "Other",
];

export const ENVIRONMENTS = [
  "Production",
  "Staging",
  "Development",
  "Mobile App (iOS)",
  "Mobile App (Android)",
];

export const BUG_CATEGORIES = [
  "Dashboard & Widgets",
  "Smart Maps",
  "Complaint Management",
  "Reports & Exports",
  "AI Copilot",
  "Sensor Network",
  "Authentication & Login",
  "Notifications",
  "Mobile App",
  "API / Integrations",
  "Other",
];

export const PLATFORMS = [
  "Web Browser",
  "iOS Mobile App",
  "Android Mobile App",
  "Desktop App",
  "API",
];

export const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Mobile Chrome", "Mobile Safari", "Other"];
export const DEVICES  = ["Desktop (Windows)", "Desktop (Mac)", "Desktop (Linux)", "iPhone", "Android Phone", "iPad", "Android Tablet", "Other"];

// ─── localStorage keys ────────────────────────────────────────────────────────

export const SUPPORT_STORAGE_KEYS = {
  tickets:         "gg-support-tickets",
  featureVotes:    "gg-support-feature-votes",
  bugReports:      "gg-support-bug-reports",
  feedbackHistory: "gg-support-feedback",
};
