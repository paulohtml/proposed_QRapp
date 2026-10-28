export type Role = 'student' | 'teacher' | 'admin';
export type EventStatus = 'open' | 'closed';
export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  id_number: string | null;
  is_active: boolean;
  created_at?: string;
};

export type EventRow = {
  id: string;
  event_code: string;
  title: string;
  description: string | null;
  venue: string | null;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  late_after_minutes: number;
  created_by: string | null;
  created_at: string;
  creator?: { full_name: string | null; email: string } | null;
  attendance?: { count: number }[];
};

export type AttendanceRow = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
  status: AttendanceStatus;
  note: string | null;
  student?: { full_name: string | null; email: string; id_number: string | null } | null;
  event?: { title: string; venue: string | null; start_time: string | null } | null;
};

export type ScanCode =
  | 'recorded'
  | 'duplicate'
  | 'closed'
  | 'not_started'
  | 'invalid_qr'
  | 'unauthorized'
  | 'error';

export type ScanResult = {
  ok: boolean;
  code: ScanCode;
  message: string;
  eventTitle?: string;
  venue?: string | null;
  scannedAt?: string;
  status?: AttendanceStatus;
};
