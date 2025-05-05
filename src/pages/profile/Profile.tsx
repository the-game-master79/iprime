import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom"; // Add this import
import { User, Shield, Upload, Save, CreditCard, Check, ShieldAlert, AlertTriangle, Clock, ArrowLeft, LogOut, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Make sure this import exists
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { KycFormData, DocumentType } from '@/types/kyc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subYears } from "date-fns"; // Add this import
import { countries as countryList } from "@/data/countries"; // Rename import to avoid conflict
import { Topbar } from "@/components/shared/Topbar";
import { KycVariant } from "@/components/shared/KycVariants";

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

// Add this validation helper at the top with other validators
const isValidCity = (city: string) => /^[A-Za-z\s-]+$/.test(city);

// Add validation helpers at the top
const isValidPostalCode = (code: string) => /^[A-Za-z0-9\s-]+$/.test(code);

// Add phone validation helper
const isValidPhone = (phone: string) => /^\d+$/.test(phone);

const Profile = () => {
  const [searchParams] = useSearchParams(); // Add this line
  const { toast } = useToast();
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    front: File | null;
    back: File | null;
  }>({
    front: null,
    back: null
  });

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    kycStatus: "pending",
    fullName: "",
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
  const [selectedCountry, setSelectedCountry] = useState("");
  const [cityError, setCityError] = useState("");
  const [postalError, setPostalError] = useState("");

  // Add validation states
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [fileError, setFileError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Add new state for tracking if details are set
  const [basicDetailsSet, setBasicDetailsSet] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferrerName(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the enhanced validation function
      const { data, error } = await supabase
        .rpc('validate_referral_code', { 
          p_referral_code: code,
          p_user_id: user.id 
        });

      if (error) {
        setReferrerName(null);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!data.is_valid) {
        setReferrerName(null);
        toast({
          title: "Invalid Code",
          description: data.message,
          variant: "destructive",
        });
        return;
      }

      // Get referrer's name if code is valid
      const { data: referrerData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.referrer_id)
        .single();

      if (referrerData) {
        setReferrerName(referrerData.full_name);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referred_by: referralCode })
        .eq('id', user.id);

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

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(authError?.message || 'No authenticated user found');

      // Get profile data including contact details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          country,
          kyc_status,
          full_name,
          date_joined,
          status,
          referred_by
        `)
        .eq('id', user.id)
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

      // Map profile data to form fields
      setUserData({
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        email: profile?.email || user.email || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
        city: profile?.city || "",
        country: profile?.country || "",
        kycStatus: profile?.kyc_status || 'pending',
        fullName: profile?.full_name || "",
        dateJoined: profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : new Date().toLocaleDateString(),
        status: profile?.status || "active",
        referred_by: profile?.referred_by || ""
      });

      // After setting userData, fetch referrer name if exists
      if (profile?.referred_by) {
        const referrerName = await fetchReferrerName(profile.referred_by);
        setCurrentReferrerName(referrerName);
      }

      // Fetch KYC data
      const { data: kycData } = await supabase
        .from('kyc')
        .select('*')
        .eq('user_id', user.id)
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
    } finally {
      setIsLoading(false);
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
      setPostalError("Only letters, numbers, spaces and hyphens are allowed");
    } else {
      setPostalError("");
    }
    setKycFormData(prev => ({...prev, postal_code: value}));
  };

  // Add phone validation handler
  const handlePhoneChange = (value: string) => {
    if (!isValidPhone(value)) {
      setPhoneError("Only numbers are allowed");
    } else {
      setPhoneError("");
    }
    setUserData(prev => ({...prev, phone: value}));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields before submission
    if (!userData.phone || !userData.address || !userData.city || !userData.country) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPersonal(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const updates = {
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        country: userData.country,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

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
      const frontFileName = `${user.id}/front_${Date.now()}${getFileExtension(kycFormData.document_front.name)}`;
      const backFileName = `${user.id}/back_${Date.now()}${getFileExtension(kycFormData.document_back.name)}`;

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
        .eq('user_id', user.id);

      // Then create new KYC record
      const { error: kycError } = await supabase
        .from('kyc')
        .insert({
          user_id: user.id,
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
        .eq('id', user.id);

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

  return (
    <div className="min-h-screen bg-black">
      <Topbar title="Profile & KYC" />

      <main className="py-6">
        <div className="container mx-auto max-w-[1000px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="w-fit mb-8 h-12 rounded-xl p-1 bg-[#212121]">
                <TabsTrigger value="personal" className="rounded-lg h-10 px-6">Personal Info</TabsTrigger>
                <TabsTrigger value="kyc" className="rounded-lg h-10 px-6">KYC Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <div className="grid gap-6">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-1 col-span-1">
                      <p className="text-sm text-muted-foreground">First Name</p>
                      <p className="font-medium">{userData.firstName}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-1 col-span-1">
                      <p className="text-sm text-muted-foreground">Last Name</p>
                      <p className="font-medium">{userData.lastName}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{userData.email}</p>
                    </div>
                  </div>

                  {/* Rest of the personal info form */}
                  <form onSubmit={handlePersonalInfoUpdate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="relative">
                        {basicDetailsSet ? (
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Phone Number</p>
                            <p className="font-medium">+{userData.phone}</p>
                          </div>
                        ) : (
                          <>
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-muted-foreground">+</span>
                            </div>
                            <Input 
                              id="phone" 
                              name="phone"
                              value={userData.phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              className={`pl-7 ${phoneError ? "border-red-500" : ""}`}
                              placeholder="Phone Number"
                              type="tel"
                            />
                            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                          </>
                        )}
                      </div>
                      {basicDetailsSet ? (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{userData.address}</p>
                        </div>
                      ) : (
                        <Input 
                          id="address" 
                          name="address"
                          value={userData.address}
                          onChange={(e) => setUserData(prev => ({...prev, address: e.target.value}))}
                          placeholder="Address"
                        />
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {basicDetailsSet ? (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">City</p>
                          <p className="font-medium">{userData.city}</p>
                        </div>
                      ) : (
                        <Input 
                          id="city" 
                          name="city"
                          value={userData.city}
                          onChange={(e) => setUserData(prev => ({...prev, city: e.target.value}))}
                          placeholder="City"
                        />
                      )}
                      {basicDetailsSet ? (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Country</p>
                          <p className="font-medium">{userData.country}</p>
                        </div>
                      ) : (
                        <Select
                          value={userData.country}
                          onValueChange={(value) => setUserData(prev => ({...prev, country: value}))}
                          disabled={basicDetailsSet}
                        >
                          <SelectTrigger className={basicDetailsSet ? "bg-muted" : ""}>
                            <SelectValue placeholder="Select your country">
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
                          <SelectContent>
                            {countryList[0].map((country) => (
                              <SelectItem key={`personal-${country.code}`} value={country.name}>
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                    alt={`${country.name} flag`}
                                    className="h-4 w-auto object-contain"
                                  />
                                  <span>{country.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {!basicDetailsSet && (
                      <Button 
                        type="submit" 
                        disabled={isUpdatingPersonal || !userData.phone || !userData.address || !userData.city || !userData.country} 
                        className="mt-6"
                      >
                        {isUpdatingPersonal ? "Processing..." : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                  </form>

                  {/* Add Referral Section if user doesn't have a referrer */}
                  {userData.referred_by ? (
                    <div className="space-y-2 pt-4 border-t">
                      <h3 className="font-medium">Referral Information</h3>
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-green-800">
                              Referred by: <span className="font-medium">{currentReferrerName}</span>
                            </p>
                            <p className="text-xs text-green-600">Referral Code: {userData.referred_by}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-4 border-t border-secondary">
                      <h3 className="font-medium">Add Referral Code</h3>
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
                          />
                          {isValidatingCode && (
                            <p className="text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Validating code...
                            </p>
                          )}
                          {referralCode && !isValidatingCode && referrerName && (
                            <p className="text-sm text-green-600">
                              <Check className="h-3 w-3 inline mr-1" />
                              Referred by: {referrerName}
                            </p>
                          )}
                          {referralCode && !isValidatingCode && !referrerName && (
                            <p className="text-sm text-red-600">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              Invalid referral code. Please check and try again.
                            </p>
                          )}
                        </div>
                        <Button 
                          onClick={handleReferralSubmit}
                          disabled={!referralCode || !referrerName || isSubmittingReferral}
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
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium">Personal Details</h3>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Input
                                id="full_name"
                                value={kycFormData.full_name}
                                onChange={handleNameChange}
                                className={nameError ? "border-red-500" : ""}
                                placeholder="Full Name (as per the document)"
                              />
                              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                            </div>
                            <div className="space-y-2">
                              <Input
                                id="date_of_birth"
                                type="date"
                                max={format(subYears(new Date(), 16), 'yyyy-MM-dd')}
                                value={kycFormData.date_of_birth}
                                onChange={handleDobChange}
                                className={dobError ? "border-red-500" : ""}
                                placeholder="Date of Birth"
                              />
                              {dobError && <p className="text-xs text-red-500">{dobError}</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Input
                              id="address"
                              value={kycFormData.address}
                              onChange={(e) => setKycFormData(prev => ({...prev, address: e.target.value}))}
                              placeholder="Your residential address"
                              className="w-full"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Select
                                value={kycFormData.country}
                                onValueChange={(value) => setKycFormData(prev => ({...prev, country: value}))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Your country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {countryList[0].map((country) => (
                                    <SelectItem key={`kyc-${country.code}`} value={country.name}>
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                          alt={`${country.name} flag`}
                                          className="h-4 w-auto object-contain"
                                        />
                                        <span>{country.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Input
                                id="state"
                                value={kycFormData.state}
                                onChange={(e) => setKycFormData(prev => ({...prev, state: e.target.value}))}
                                placeholder="Your state or province"
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Input
                                id="city"
                                value={kycFormData.city}
                                onChange={(e) => handleCityChange(e.target.value)}
                                placeholder="Your city name"
                                className={cityError ? "border-red-500" : ""}
                              />
                              {cityError && <p className="text-xs text-red-500">{cityError}</p>}
                            </div>
                            <div className="space-y-2">
                              <Input
                                id="postal_code"
                                value={kycFormData.postal_code}
                                onChange={(e) => handlePostalChange(e.target.value)}
                                placeholder="Your postal code"
                                className={postalError ? "border-red-500" : ""}
                              />
                              {postalError && <p className="text-xs text-red-500">{postalError}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Document Identification Section */}
                        <div className="space-y-4 pt-4 border-t border-secondary">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium">Document Identification</h3>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Select 
                                value={kycFormData.document_type}
                                onValueChange={(value: DocumentType) => 
                                  setKycFormData(prev => ({...prev, document_type: value}))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="passport">Passport</SelectItem>
                                  <SelectItem value="national_id">National ID Card</SelectItem>
                                  <SelectItem value="driving_license">Driving License</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Input
                                id="document_number"
                                value={kycFormData.document_number}
                                onChange={(e) => setKycFormData(prev => ({...prev, document_number: e.target.value}))}
                                placeholder="Your document number"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Input
                              id="occupation"
                              value={kycFormData.occupation}
                              onChange={(e) => setKycFormData(prev => ({...prev, occupation: e.target.value}))}
                              placeholder="Your occupation"
                            />
                          </div>
                        </div>

                        {/* Document Upload Section */}
                        <div className="space-y-4 pt-4 border-t border-secondary">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Upload className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium">Document Upload</h3>
                          </div>

                          <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                            <p className="font-medium text-sm mb-2">Document Upload Requirements:</p>
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
                        className={`w-full ${userData.kycStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}`}
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
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Profile;
