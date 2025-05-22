import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
// Replace Lucide icons with Phosphor regular icons
import {
  User as UserIcon,
  Shield as ShieldIcon,
  UploadSimple as UploadIcon,
  FloppyDisk as SaveIcon,
  IdentificationCard as CreditCardIcon,
  Check as CheckIcon,
  WarningCircle as AlertTriangleIcon,
  Clock as ClockIcon,
  ArrowLeft as ArrowLeftIcon,
  SignOut as LogOutIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Calendar as CalendarIcon
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase"; // Make sure this import exists
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { KycFormData, DocumentType } from '@/types/kyc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, subYears } from "date-fns"; // Add this import
import { countries as countryList } from "@/data/countries"; // Rename import to avoid conflict
import { Topbar } from "@/components/shared/Topbar";
import { KycVariant } from "@/components/shared/KycVariants";
import { useUserProfile } from "@/contexts/UserProfileContext";

// Add these validation helpers at the top of the file, before the Profile component
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'];

// Helper to validate name (only letters, spaces and hyphens)
const isValidName = (name: string) => /^[A-Za-z\s-]+$/.test(name);

// Helper to validate minimum age
const isValidAge = (dob: string) => {
  const minAge = 16;
  const dobDate = new Date(dob);
  const minDate = subYears(new Date(), minAge);
  return dobDate <= minDate;
};

// Update validation helpers
const isValidCity = (city: string) => /^[A-Za-z\s-]+$/.test(city);
const isValidState = (state: string) => /^[A-Za-z\s-]+$/.test(state);
const isValidOccupation = (occupation: string) => /^[A-Za-z\s-]+$/.test(occupation);
// Postal code: only numbers, spaces, hyphens allowed (no alphabets)
const isValidPostalCode = (code: string) => /^[0-9\s-]+$/.test(code);

// Add phone validation helper
const isValidPhone = (phone: string) => /^\d+$/.test(phone);

const Profile = () => {
  const { profile, loading } = useUserProfile();
  const [searchParams] = useSearchParams(); // Add this line
  const { toast } = useToast();
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    front: File | null;
    back: File | null;
  }>({
    front: null,
    back: null
  });

  const [selectedCountry, setSelectedCountry] = useState<{name: string, code: string, phone: string} | null>(null);

  // Rest of the state declarations
  const [userData, setUserData] = useState({
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    kycStatus: "pending",
    fullName: "",
    firstName: "",
    lastName: "",
    dateJoined: "",
    status: "",
    referred_by: ""
  });

  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [currentReferrerName, setCurrentReferrerName] = useState<string | null>(null);

  const [kycFormData, setKycFormData] = useState<KycFormData>({
    full_name: "",
    date_of_birth: "",
    address: "",
    city: "",
    state: "",
    country: "",
    document_type: "passport",
    document_number: "",
    document_front: null,
    document_back: null,
    occupation: "",
    postal_code: ""
  });

  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [kycData, setKycData] = useState<any>(null);

  // Add new state for location dropdowns
  const [countryInfo, setCountryInfo] = useState<{name: string, code: string, phone: string} | null>(null);
  const [cityError, setCityError] = useState("");
  const [postalError, setPostalError] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("");

  // Add validation states
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [fileError, setFileError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [stateError, setStateError] = useState("");
  const [occupationError, setOccupationError] = useState("");

  // Add new state for tracking if details are set
  const [basicDetailsSet, setBasicDetailsSet] = useState(false);

  const [userProfile, setUserProfile] = useState<{ id: string; full_name?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', currentUser.id)
        .single();
      setUserProfile(data);
    };
    if (currentUser) fetchProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Helper to mask email
  const maskEmail = (email: string) => {
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  };

  // Helper to fetch and mask referrer's email
  const fetchReferrerMaskedEmail = async (referralCode: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('referral_code', referralCode)
        .single();
      if (error || !data?.email) return null;
      return maskEmail(data.email);
    } catch {
      return null;
    }
  };

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferrerName(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      if (!currentUser) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('validate_referral_code', { 
          p_referral_code: code,
          p_user_id: currentUser.id 
        });

      console.log("validate_referral_code response:", { data, error });

      if (error) {
        setReferrerName(null);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      let result = data;
      if (Array.isArray(data)) {
        result = data[0];
      }

      if (!result?.is_valid) {
        setReferrerName(null);
        toast({
          title: "Invalid Code",
          description: result?.message || "Invalid referral code",
          variant: "destructive",
        });
        return;
      }

      // Fetch referrer's email and mask it
      const { data: referrerData, error: refNameError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', result.referrer_id)
        .single();

      console.log("Referrer fetch:", { referrerData, refNameError });

      if (referrerData?.email) {
        setReferrerName(maskEmail(referrerData.email));
      } else {
        setReferrerName(null);
      }
    } catch (error) {
      setReferrerName(null);
      console.error('Error validating referral code:', error);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralCode || !referrerName) return;

    setIsSubmittingReferral(true);
    try {
      if (!currentUser) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referred_by: referralCode })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      toast({
        title: "Referral Added",
        description: `You are now referred by ${referrerName}`,
      });
      
      // Refresh user data
      await fetchProfile();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add referral",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const fetchReferrerName = async (referralCode: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('referral_code', referralCode)
        .single();
  
      if (error || !data) return null;
      return data.full_name;
    } catch (error) {
      return null;
    }
  };

  // Main fetchProfile function (keep only one)
  const fetchProfile = async () => {
    try {
      if (!currentUser) return; // Only run if currentUser is set

      // Get profile data including contact details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          country,
          kyc_status,
          date_joined,
          status,
          referred_by
        `)
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      // Set basicDetailsSet to true if required fields are filled
      const hasSubmittedDetails = !!(
        profile?.phone && 
        profile?.address && 
        profile?.city && 
        profile?.country
      );
      setBasicDetailsSet(hasSubmittedDetails);

      setUserData({
        fullName: profile?.full_name || "",
        firstName: profile?.first_name || (profile?.full_name?.split(" ")[0] || ""),
        lastName: profile?.last_name || (profile?.full_name?.split(" ").slice(1).join(" ") || ""),
        email: profile?.email || currentUser.email || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
        city: profile?.city || "",
        country: profile?.country || "",
        kycStatus: profile?.kyc_status || 'pending',
        dateJoined: profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : new Date().toLocaleDateString(),
        status: profile?.status || "active",
        referred_by: profile?.referred_by || ""
      });

      // After setting userData, fetch referrer masked email if exists
      if (profile?.referred_by) {
        const referrerMaskedEmail = await fetchReferrerMaskedEmail(profile.referred_by);
        setCurrentReferrerName(referrerMaskedEmail);
      }

      // Fetch KYC data
      const { data: kycData } = await supabase
        .from('kyc')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (kycData?.[0]) {
        setKycData(kycData[0]);
        // Only set KYC form data if status is not rejected
        if (profile?.kyc_status !== 'rejected') {
          setKycFormData({
            full_name: kycData[0].full_name || "",
            date_of_birth: kycData[0].date_of_birth || "",
            address: kycData[0].address || "",
            city: kycData[0].city || "",
            state: kycData[0].state || "",
            country: kycData[0].country || "",
            document_type: kycData[0].document_type || "passport",
            document_number: kycData[0].document_number || "",
            document_front: null,
            document_back: null,
            occupation: kycData[0].occupation || "",
            postal_code: kycData[0].postal_code || ""
          });
        } else {
          // Reset form if KYC was rejected
          setKycFormData({
            full_name: "",
            date_of_birth: "",
            address: "",
            city: "",
            state: "",
            country: "",
            document_type: "passport",
            document_number: "",
            document_front: null,
            document_back: null,
            occupation: "",
            postal_code: ""
          });
        }
      }

    } catch (error) {
      console.error('Profile fetch failed:', {
        error,
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Error Loading Profile",
        description: error instanceof Error ? error.message : "Failed to load profile data",
        variant: "destructive",
      });
    }
  };



  // Add validation handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isValidName(value)) {
      setNameError("Only letters, spaces and hyphens are allowed");
    } else {
      setNameError("");
    }
    setKycFormData(prev => ({...prev, full_name: value}));
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isValidAge(value)) {
      setDobError("You must be at least 16 years old");
    } else {
      setDobError("");
    }
    setKycFormData(prev => ({...prev, date_of_birth: value}));
  };

  const handleFileValidation = (file: File | null) => {
    if (!file) return false;
    
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size must be less than 10MB");
      return false;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError("Only JPG, PNG, SVG and PDF files are allowed");
      return false;
    }
    
    setFileError("");
    return true;
  };

  // Add city validation handler
  const handleCityChange = (value: string) => {
    if (!isValidCity(value)) {
      setCityError("Only letters, spaces and hyphens are allowed");
    } else {
      setCityError("");
    }
    setKycFormData(prev => ({...prev, city: value}));
  };

  // Add handlers before the return statement
  const handlePostalChange = (value: string) => {
    if (!isValidPostalCode(value)) {
      setPostalError("Only numbers, spaces and hyphens are allowed");
    } else {
      setPostalError("");
    }
    setKycFormData(prev => ({...prev, postal_code: value}));
  };

  // Add phone validation handler
  const handlePhoneChange = (value: string) => {
    // Remove any non-digit characters 
    const cleanValue = value.replace(/[^\d]/g, '');
    
    if (!cleanValue) {
      setPhoneError("Phone number is required");
      setUserData(prev => ({...prev, phone: cleanValue}));
      return;
    }

    if (!/^\d+$/.test(cleanValue)) {
      setPhoneError("Only numbers are allowed");
    } else if (cleanValue.length > 40) {
      setPhoneError("Phone number cannot exceed 40 digits");
    } else {
      setPhoneError("");
    }

    // Store the number with the country code
    setUserData(prev => ({...prev, phone: cleanValue.slice(0, 40)}));
  };

  // Add state validation handler
  const handleStateChange = (value: string) => {
    if (!isValidState(value)) {
      setStateError("Only letters, spaces and hyphens are allowed");
    } else {
      setStateError("");
    }
    setKycFormData(prev => ({...prev, state: value}));
  };

  // Add occupation validation handler
  const handleOccupationChange = (value: string) => {
    if (!isValidOccupation(value)) {
      setOccupationError("Only letters, spaces and hyphens are allowed");
    } else {
      setOccupationError("");
    }
    setKycFormData(prev => ({...prev, occupation: value}));
  };

  // Effect to set initial country info and phone prefix
  useEffect(() => {
    if (userData.country) {
      const country = countryList[0].find(c => c.name === userData.country);
      if (country) {
        setCountryInfo(country);
        setPhonePrefix(country.phone);
      }
    }
  }, [userData.country]);    const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields before submission
    if (!userData.country) {
      toast({
        title: "Error",
        description: "Please select your country",
        variant: "destructive",
      });
      return;
    }

    if (!userData.phone || !userData.address || !userData.city) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const fullPhoneNumber = `${phonePrefix}${userData.phone}`;
    if (!isValidPhone(userData.phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPersonal(true);
    
    try {
      if (!currentUser) throw new Error('No user found');

      const updates = {
        phone: `${phonePrefix}${userData.phone}`,
        address: userData.address,
        city: userData.city,
        country: userData.country,
        first_name: userData.firstName,
        last_name: userData.lastName,
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      setBasicDetailsSet(true);

      toast({
        title: "Profile Updated",
        description: "Your personal information has been updated successfully.",
      });

      // Refresh profile data
      await fetchProfile();

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPersonal(false);
    }
  };

  const handleFileSelect = (docType: 'front' | 'back', file: File | null) => {
    setSelectedFiles(prev => ({
      ...prev,
      [docType]: file
    }));
  };

  const handleSubmitKYC = async () => {
    setIsSubmittingKYC(true);
    try {
      if (!currentUser) return;

      if (!kycFormData.document_front || !kycFormData.document_back) {
        throw new Error('Please select both front and back documents');
      }

      // Validate required fields
      const requiredFields = ['full_name', 'date_of_birth', 'address', 'city', 'state', 'country', 'document_type', 'document_number'] as const;
      for (const field of requiredFields) {
        if (!kycFormData[field]) {
          throw new Error(`Please fill in your ${field.replace('_', ' ')}`);
        }
      }

      // Create the storage path with user ID
      const frontFileName = `${currentUser.id}/front_${Date.now()}${getFileExtension(kycFormData.document_front.name)}`;
      const backFileName = `${currentUser.id}/back_${Date.now()}${getFileExtension(kycFormData.document_back.name)}`;

      // Upload front document
      const { error: frontError } = await supabase.storage
        .from('kyc_documents')
        .upload(frontFileName, kycFormData.document_front, {
          cacheControl: '3600',
          upsert: false
        });
      if (frontError) throw frontError;

      // Upload back document
      const { error: backError } = await supabase.storage
        .from('kyc_documents')
        .upload(backFileName, kycFormData.document_back, {
          cacheControl: '3600',
          upsert: false
        });
      if (backError) throw backError;

      // Get public URLs
      const frontUrl = supabase.storage.from('kyc_documents').getPublicUrl(frontFileName).data.publicUrl;
      const backUrl = supabase.storage.from('kyc_documents').getPublicUrl(backFileName).data.publicUrl;

      // First try to delete any existing KYC record
      await supabase
        .from('kyc')
        .delete()
        .eq('user_id', currentUser.id);

      // Then create new KYC record
      const { error: kycError } = await supabase
        .from('kyc')
        .insert({
          user_id: currentUser.id,
          document_front: frontUrl,
          document_back: backUrl,
          status: 'processing',
          ...kycFormData,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (kycError) throw kycError;

      // Rest of the function remains the same
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // Update local state to processing
      setUserData(prev => ({
        ...prev,
        kycStatus: 'processing'
      }));

      toast({
        title: "Verification Submitted",
        description: "Your documents have been submitted for verification. This usually takes 1-2 business days.",
      });

      // Reset form and fetch updated profile
      setKycFormData({
        full_name: "",
        date_of_birth: "",
        address: "",
        city: "",
        state: "",
        country: "",
        document_type: "passport",
        document_number: "",
        document_front: null,
        document_back: null,
        occupation: "",
        postal_code: ""
      });

      await fetchProfile();

    } catch (error: any) {
      console.error('Error submitting KYC:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingKYC(false);
    }
  };

  // Add this helper function
  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop();
    return ext ? `.${ext}` : '';
  };

  // Get the tab from URL or default to personal
  const defaultTab = searchParams.get('tab') || 'personal';

  // Hydrate userData from profile context when profile or currentUser is loaded
  useEffect(() => {
    // Use email from profile, fallback to currentUser if not present
    if (profile || currentUser) {
      setUserData(prev => ({
        ...prev,
        fullName: profile?.full_name || "",
        firstName: profile?.first_name || (profile?.full_name?.split(" ")[0] || ""),
        lastName: profile?.last_name || (profile?.full_name?.split(" ").slice(1).join(" ") || ""),
        email: profile?.email || currentUser?.email || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
        city: profile?.city || "",
        country: profile?.country || "",
        kycStatus: profile?.kyc_status || "pending",
        dateJoined: profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : "",
        status: profile?.status || "",
        referred_by: profile?.referred_by || ""
      }));
      setBasicDetailsSet(!!(profile?.phone && profile?.address && profile?.city && profile?.country));
    }
  }, [profile, currentUser]);

  return (
    <>
      <div className="min-h-screen bg-background">
        <Topbar title="Profile & KYC" />

        <main className="py-6">
          <div className="container mx-auto max-w-[1000px]">
            {loading ? ( // Use loading from context
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="w-fit mb-8 h-12 rounded-xl p-1 bg-secondary">
                  <TabsTrigger value="personal" className="rounded-lg h-10 px-6 text-foreground">Personal Info</TabsTrigger>
                  <TabsTrigger value="kyc" className="rounded-lg h-10 px-6 text-foreground">KYC Verification</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-6">
                  <div className="grid gap-6">
                    {/* Editable First/Last Name at the top */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {basicDetailsSet ? (
                        <>
                          <div className="p-4 bg-secondary rounded-lg space-y-1 col-span-1">
                            <p className="text-sm text-muted-foreground">First Name</p>
                            <p className="font-medium text-foreground">{userData.firstName}</p>
                          </div>
                          <div className="p-4 bg-secondary rounded-lg space-y-1 col-span-1">
                            <p className="text-sm text-muted-foreground">Last Name</p>
                            <p className="font-medium text-foreground">{userData.lastName}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2 col-span-1">
                            <label htmlFor="firstName" className="text-sm text-muted-foreground">Add your First Name</label>
                            <Input
                              id="firstName"
                              name="firstName"
                              value={userData.firstName}
                              onChange={e => setUserData(prev => ({ ...prev, firstName: e.target.value }))}
                              placeholder="First Name"
                              className="bg-secondary text-foreground placeholder:text-foreground"
                            />
                          </div>
                          <div className="space-y-2 col-span-1">
                            <label htmlFor="lastName" className="text-sm text-muted-foreground">Add your Last Name</label>
                            <Input
                              id="lastName"
                              name="lastName"
                              value={userData.lastName}
                              onChange={e => setUserData(prev => ({ ...prev, lastName: e.target.value }))}
                              placeholder="Last Name"
                              className="bg-secondary text-foreground placeholder:text-foreground"
                            />
                          </div>
                        </>
                      )}
                      <div className="p-4 bg-secondary rounded-lg space-y-1 col-span-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">{userData.email}</p>
                      </div>
                    </div>

                    {/* Rest of the personal info form */}
                    <form onSubmit={handlePersonalInfoUpdate} className="space-y-4">
                      {basicDetailsSet ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Country</p>
                            <p className="font-medium text-foreground">{userData.country}</p>
                          </div>
                          <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Phone Number</p>
                            <p className="font-medium text-foreground">+{userData.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label htmlFor="country" className="text-sm text-muted-foreground">
                             Select your Country
                            </label>
                            <Select
                              value={userData.country}
                              onValueChange={(value) => {
                                const country = countryList[0].find(c => c.name === value);
                                if (country) {
                                  setCountryInfo(country);
                                  setPhonePrefix(country.phone);
                                  setUserData(prev => ({
                                    ...prev,
                                    country: value,
                                    phone: prev.phone.replace(/^[0-9]+/, '')
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="bg-secondary text-foreground">
                                <SelectValue placeholder="Select your country" className="text-foreground">
                                  {userData.country && countryList[0].find(c => c.name === userData.country) && (
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={`https://flagcdn.com/w20/${countryList[0].find(c => c.name === userData.country)?.code.toLowerCase()}.png`}
                                        alt={`${userData.country} flag`}
                                        className="h-4 w-auto object-contain"
                                      />
                                      <span>{userData.country}</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent position="popper" align="start" side="bottom" sideOffset={5} className="w-[400px] bg-secondary text-foreground">
                                <ScrollArea className="h-[200px]">
                                  <SelectGroup>
                                    {countryList[0].map((country) => (
                                      <SelectItem
                                        key={`personal-${country.code}`}
                                        value={country.name}
                                        className="flex items-center gap-2 text-foreground"
                                      >
                                        <div className="flex items-center gap-2 flex-1">
                                          <img
                                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                            alt={`${country.name} flag`}
                                            className="h-4 w-auto object-contain"
                                          />
                                          <span className="font-medium">{country.name}</span>
                                          <span className="text-muted-foreground text-sm ml-auto">+{country.phone}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </ScrollArea>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm text-muted-foreground">
                              Enter your Phone Number
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-muted-foreground text-sm font-medium min-w-[36px] text-left">
                                  +{phonePrefix}
                                </span>
                              </div>
                              <Input 
                                id="phone" 
                                name="phone"
                                value={userData.phone}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^\d]/g, '');
                                  if (value.length <= 40) {
                                    setUserData(prev => ({...prev, phone: value}));
                                    if (!value) {
                                      setPhoneError("Phone number is required");
                                    } else if (!/^\d+$/.test(value)) {
                                      setPhoneError("Only numbers are allowed");
                                    } else {
                                      setPhoneError("");
                                    }
                                  }
                                }}
                                className={`pl-12 bg-secondary text-foreground placeholder:text-foreground ${phoneError ? "border-red-500" : ""} ${!phonePrefix ? "opacity-50 cursor-not-allowed" : ""}`}
                                placeholder="Phone Number"
                                type="tel"
                                disabled={!phonePrefix}
                              />
                              {!phonePrefix && (
                                <p className="text-xs text-muted-foreground mt-1">Please select a country first</p>
                              )}
                              {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* City and Address section */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {basicDetailsSet ? (
                          <>
                            <div className="p-4 bg-secondary rounded-lg">
                              <p className="text-sm text-muted-foreground">City</p>
                              <p className="font-medium text-foreground">{userData.city}</p>
                            </div>
                            <div className="p-4 bg-secondary rounded-lg">
                              <p className="text-sm text-muted-foreground">Address</p>
                              <p className="font-medium text-foreground">{userData.address}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <label htmlFor="city" className="text-sm text-muted-foreground">
                                Enter your City
                              </label>
                              <Input 
                                id="city" 
                                name="city"
                                value={userData.city}
                                onChange={(e) => setUserData(prev => ({...prev, city: e.target.value}))}
                                placeholder="City"
                                className="bg-secondary text-foreground placeholder:text-foreground"
                              />
                            </div>
                            <div className="space-y-2">
                              <label htmlFor="address" className="text-sm text-muted-foreground">
                                Add your Address
                              </label>
                              <Input 
                                id="address" 
                                name="address"
                                value={userData.address}
                                onChange={(e) => setUserData(prev => ({...prev, address: e.target.value}))}
                                placeholder="Address"
                                className="bg-secondary text-foreground placeholder:text-foreground"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {!basicDetailsSet && (
                        <Button 
                          type="submit" 
                          disabled={isUpdatingPersonal || !userData.phone || !userData.address || !userData.city || !userData.country || !userData.fullName} 
                          className="mt-6 bg-primary text-white"
                        >
                          {isUpdatingPersonal ? "Processing..." : (
                            <>
                              <SaveIcon className="h-4 w-4 mr-2" weight="regular" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      )}
                    </form>

                    {/* Add Referral Section if user doesn't have a referrer */}
                    {userData.referred_by ? (
                      <div className="space-y-2 pt-4 border-t border-secondary">
                        <h3 className="font-medium text-foreground">Referral Information</h3>
                        <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckIcon className="h-5 w-5 text-green-600" weight="regular" />
                            </div>
                            <div>
                              <p className="text-sm text-green-800">
                                Referred by: <span className="font-medium">{currentReferrerName /* this is already the masked email */}</span>
                              </p>
                              <p className="text-xs text-green-600">Referral Code: {userData.referred_by}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-4 border-t border-secondary">
                        <h3 className="font-medium text-foreground">Add Referral Code</h3>
                        <p className="text-sm text-muted-foreground">
                          If someone referred you to our platform, you can add their referral code here
                        </p>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Enter referral code"
                              value={referralCode}
                              onChange={(e) => {
                                setReferralCode(e.target.value);
                                validateReferralCode(e.target.value);
                              }}
                              className="bg-secondary text-foreground placeholder:text-foreground"
                            />
                            {isValidatingCode && (
                              <p className="text-sm text-muted-foreground">
                                <ClockIcon className="h-3 w-3 inline mr-1" weight="regular" />
                                Validating code...
                              </p>
                            )}
                            {referralCode && !isValidatingCode && referrerName && (
                              <p className="text-sm text-success">
                                <CheckIcon className="h-3 w-3 inline mr-1" weight="regular" />
                                Referred by: {referrerName}
                              </p>
                            )}
                            {referralCode && !isValidatingCode && !referrerName && (
                              <p className="text-sm text-red-600">
                                <AlertTriangleIcon className="h-3 w-3 inline mr-1" weight="regular" />
                                Invalid referral code. Please check and try again.
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={handleReferralSubmit}
                            disabled={!referralCode || !referrerName || isSubmittingReferral}
                            className="bg-primary text-white"
                          >
                            {isSubmittingReferral ? "Adding..." : "Add Referral"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="kyc">
                  <div className="space-y-6">
                    {isLoadingKyc ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <KycVariant 
                        status={userData.kycStatus || 'required'} 
                        date={kycData?.updated_at ? new Date(kycData.updated_at) : undefined}
                      />
                    )}

                    {/* Show KYC form for rejected, pending or initial state */}
                    {(userData.kycStatus === 'rejected' || userData.kycStatus === 'pending' || !userData.kycStatus) && (
                        <div className="space-y-8">
                          {/* Personal Details Section */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-blue-600" weight="regular" />
                              </div>
                              <h3 className="text-lg font-medium text-foreground">Personal Details</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label htmlFor="full_name" className="text-sm text-muted-foreground">
                                  Full Name (as per the document)
                                </label>
                                <Input
                                  id="full_name"
                                  value={kycFormData.full_name}
                                  onChange={handleNameChange}
                                  className={`bg-secondary text-foreground placeholder:text-foreground ${nameError ? "border-red-500" : ""}`}
                                  placeholder="Enter your full name"
                                  aria-label="Full Name"
                                />
                                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="date_of_birth" className="text-sm text-muted-foreground">
                                  Date of Birth
                                </label>
                                <div className="relative">
                                  <Input
                                    id="date_of_birth"
                                    type="date"
                                    max={format(subYears(new Date(), 16), 'yyyy-MM-dd')}
                                    value={kycFormData.date_of_birth}
                                    onChange={handleDobChange}
                                    className={`bg-secondary text-foreground placeholder:text-foreground ${dobError ? "border-red-500 pr-10" : "pr-10"}`}
                                    placeholder="Date of Birth"
                                    style={{ colorScheme: "dark" }}
                                  />
                                  {/* White calendar icon overlay */}
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <CalendarIcon color="#fff" size={20} weight="regular" />
                                  </span>
                                </div>
                                {dobError && <p className="text-xs text-red-500">{dobError}</p>}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="address" className="text-sm text-muted-foreground">
                                Residential Address
                              </label>
                              <Input
                                id="address"
                                value={kycFormData.address}
                                onChange={(e) => setKycFormData(prev => ({...prev, address: e.target.value}))}
                                placeholder="Enter your residential address"
                                className="w-full bg-secondary text-foreground placeholder:text-foreground"
                                aria-label="Residential Address"
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label htmlFor="country" className="text-sm text-muted-foreground">
                                  Country
                                </label>
                                <Select
                                  value={kycFormData.country}
                                  onValueChange={(value) => setKycFormData(prev => ({...prev, country: value}))}
                                >
                                  <SelectTrigger className="bg-secondary text-foreground">
                                    <SelectValue placeholder="Your country" className="text-foreground" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-secondary text-foreground">
                                    <SelectItem value="passport" className="text-foreground">Passport</SelectItem>
                                    <SelectItem value="national_id" className="text-foreground">National ID Card</SelectItem>
                                    <SelectItem value="driving_license" className="text-foreground">Driving License</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="state" className="text-sm text-muted-foreground">
                                  State/Province
                                </label>
                                <Input
                                  id="state"
                                  value={kycFormData.state}
                                  onChange={e => {
                                    // Only allow letters, spaces, hyphens
                                    const value = e.target.value.replace(/[^A-Za-z\s-]/g, "");
                                    setKycFormData(prev => ({ ...prev, state: value }));
                                  }}
                                  placeholder="Enter your state or province"
                                  aria-label="State or Province"
                                  className="bg-secondary text-foreground placeholder:text-foreground"
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label htmlFor="city" className="text-sm text-muted-foreground">
                                  City
                                </label>
                                <Input
                                  id="city"
                                  value={kycFormData.city}
                                  onChange={e => {
                                    // Only allow letters, spaces, hyphens
                                    const value = e.target.value.replace(/[^A-Za-z\s-]/g, "");
                                    setKycFormData(prev => ({ ...prev, city: value }));
                                  }}
                                  placeholder="Your city name"
                                  className="bg-secondary text-foreground placeholder:text-foreground"
                                />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="postal_code" className="text-sm text-muted-foreground">
                                  Postal Code
                                </label>
                                <Input
                                  id="postal_code"
                                  value={kycFormData.postal_code}
                                  onChange={e => {
                                    // Only allow numbers, spaces, hyphens
                                    const value = e.target.value.replace(/[^0-9\s-]/g, "");
                                    setKycFormData(prev => ({ ...prev, postal_code: value }));
                                  }}
                                  placeholder="Enter your postal code"
                                  aria-label="Postal Code"
                                  className="bg-secondary text-foreground placeholder:text-foreground"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Document Identification Section */}
                          <div className="space-y-4 pt-4 border-t border-secondary">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <CreditCardIcon className="h-4 w-4 text-blue-600" weight="regular" />
                              </div>
                              <h3 className="text-lg font-medium text-foreground">Document Identification</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Select 
                                  value={kycFormData.document_type}
                                  onValueChange={(value: DocumentType) => 
                                    setKycFormData(prev => ({...prev, document_type: value}))
                                  }
                                >
                                  <SelectTrigger className="bg-secondary text-foreground">
                                    <SelectValue placeholder="Select document type" className="text-foreground" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-secondary text-foreground">
                                    <SelectItem value="passport" className="text-foreground">Passport</SelectItem>
                                    <SelectItem value="national_id" className="text-foreground">National ID Card</SelectItem>
                                    <SelectItem value="driving_license" className="text-foreground">Driving License</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="document_number" className="text-sm text-muted-foreground">
                                  Document Number
                                </label>
                                <Input
                                  id="document_number"
                                  value={kycFormData.document_number}
                                  onChange={(e) => setKycFormData(prev => ({...prev, document_number: e.target.value}))}
                                  placeholder="Enter your document number"
                                  aria-label="Document Number"
                                  className="bg-secondary text-foreground placeholder:text-foreground"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="occupation" className="text-sm text-muted-foreground">
                                Occupation
                              </label>
                              <Input
                                id="occupation"
                                value={kycFormData.occupation}
                                onChange={e => {
                                  // Only allow letters, spaces, hyphens
                                  const value = e.target.value.replace(/[^A-Za-z\s-]/g, "");
                                  setKycFormData(prev => ({ ...prev, occupation: value }));
                                }}
                                placeholder="Your occupation"
                                className="bg-secondary text-foreground placeholder:text-foreground"
                              />
                            </div>
                          </div>

                          {/* Document Upload Section */}
                          <div className="space-y-4 pt-4 border-t border-secondary">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <UploadIcon className="h-4 w-4 text-blue-600" weight="regular" />
                              </div>
                              <h3 className="text-lg font-medium text-foreground">Document Upload</h3>
                            </div>

                            <div className="rounded-lg border border-dashed p-4 bg-secondary/50">
                              <p className="font-medium text-sm mb-2 text-foreground">Document Upload Requirements:</p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>File size must be less than 10MB</li>
                                <li>Accepted formats: JPG, PNG, SVG, PDF</li>
                                <li>Images must be clear and legible</li>
                                <li>All document edges must be visible</li>
                                <li>No videos or animated GIFs allowed</li>
                              </ul>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Input 
                                  id="idFront" 
                                  type="file" 
                                  accept=".jpg,.jpeg,.png,.svg,.pdf"
                                  className="bg-secondary text-foreground"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file && handleFileValidation(file)) {
                                      handleFileSelect('front', file);
                                      setKycFormData(prev => ({...prev, document_front: file}));
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Input 
                                  id="idBack" 
                                  type="file" 
                                  accept=".jpg,.jpeg,.png,.svg,.pdf"
                                  className="bg-secondary text-foreground"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file && handleFileValidation(file)) {
                                      handleFileSelect('back', file);
                                      setKycFormData(prev => ({...prev, document_back: file}));
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                          </div>
                        </div>
                    )}
                    {/* Update button visibility condition */}
                    {(userData.kycStatus === 'rejected' || userData.kycStatus === 'pending' || !userData.kycStatus) && (
                      <div className="mt-8">
                        <Button 
                          onClick={handleSubmitKYC} 
                          disabled={isSubmittingKYC || !selectedFiles.front || !selectedFiles.back}
                          className={`w-full ${userData.kycStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary text-white'}`}
                        >
                          {isSubmittingKYC ? (
                            <>Processing...</>
                          ) : (
                            <>{userData.kycStatus === 'rejected' ? 'Submit Again' : 'Submit for Verification'}</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>

        {/* Update logout container */}
        <div className="container mx-auto max-w-[1000px] py-6 border-t border-secondary mt-8">
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white"
          >
            <LogOutIcon className="h-4 w-4 text-white" weight="regular"/>
            Logout
          </Button>
        </div>
      </div>
    </>
  );
};

export default Profile;
