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
  occupation: string;
  postal_code: string;
  phone?: string;
  phoneCode?: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  phone: string;
}

// Add validation constants
export const MAX_CITY_LENGTH = 100;
export const ADDRESS_PATTERN = /^[a-zA-Z0-9\s,.-]+$/;
export const PHONE_PATTERN = /^\+?[0-9]+$/;

// Add validation helper functions
export const isValidAddress = (address: string): boolean => {
  return ADDRESS_PATTERN.test(address) && address.length > 0;
};

export const isValidCity = (city: string): boolean => {
  return ADDRESS_PATTERN.test(city) && city.length <= MAX_CITY_LENGTH;
};

export const isValidPhone = (phone: string): boolean => {
  return PHONE_PATTERN.test(phone);
};

export const formatPhoneWithCountryCode = (phone: string, countryCode: string): string => {
  // Remove any existing '+' or country code
  const cleanPhone = phone.replace(/^\+/, '').replace(/^[0-9]{1,4}/, '');
  return `+${countryCode}${cleanPhone}`;
};
