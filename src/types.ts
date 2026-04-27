export type EmergencyType = 'Fire' | 'Medical' | 'Threat' | 'Other';
export type IncidentStatus = 'reported' | 'accepted' | 'on-the-way' | 'resolved' | 'escalated';
export type StaffRole = 'Security' | 'Medical' | 'Housekeeping' | 'Manager';

export interface Incident {
  id: string;
  type: EmergencyType;
  guestLocation: string;
  status: IncidentStatus;
  staffId: string | null;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  resolvedAt?: any;
  escalatedAt?: any;
  floor: number;
  reporterId: string;
  metadata?: Record<string, any>;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  status: 'available' | 'busy' | 'offline';
  email: string;
}

export interface ActivityRecord {
  id: string;
  incidentId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: any;
}
