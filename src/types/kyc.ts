export type KycStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export type DocumentType = 'passport' | 'national_id' | 'driving_license';

export interface KycFormData {
  full_name: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  country: string;
  document_type: DocumentType;
  document_number: string;
  document_front: File | null;
  document_back: File | null;
}
