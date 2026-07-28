export type AuthorityType = "pollution" | "water" | "municipal" | "emergency";

export interface Authority {
  id: string;
  name: string;
  type: AuthorityType;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  hours?: string;
}

export const AUTHORITY_TYPE_LABEL: Record<AuthorityType, string> = {
  pollution: "Pollution Control",
  water: "Water & Sanitation",
  municipal: "Municipal Body",
  emergency: "Emergency Services",
};

const DEFAULT_AUTHORITIES: Authority[] = [
  {
    id: "auth-1",
    name: "State Pollution Control Board",
    type: "pollution",
    phone: "+91 80 2221 9770",
    email: "contact@spcb.gov.in",
    website: "https://spcb.gov.in",
    address: "Central Office, Environmental Enclave",
    hours: "Mon-Fri 09:30 - 17:30",
  },
  {
    id: "auth-2",
    name: "City Water Supply & Sewerage Board",
    type: "water",
    phone: "+91 80 2294 5100",
    email: "helpdesk@bwssb.gov.in",
    website: "https://waterboard.gov.in",
    address: "Water Works Building, Main Road",
    hours: "24/7 Helpline",
  },
  {
    id: "auth-3",
    name: "City Municipal Corporation",
    type: "municipal",
    phone: "+91 80 2222 1188",
    email: "commissioner@citycorp.gov.in",
    website: "https://citycorp.gov.in",
    address: "Corporation Offices, Town Hall",
    hours: "Mon-Sat 10:00 - 17:00",
  },
  {
    id: "auth-4",
    name: "Disaster Management & Emergency Services",
    type: "emergency",
    phone: "112",
    email: "emergency@disaster.gov.in",
    website: "https://ndma.gov.in",
    address: "Emergency Response Center",
    hours: "24/7 Service",
  },
];

export function getAuthoritiesForCity(_cityId: string, _country?: string): Authority[] {
  return DEFAULT_AUTHORITIES;
}
