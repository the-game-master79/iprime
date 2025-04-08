import { useState, useEffect } from "react";
import { User, Lock, Bell, Shield, Upload, Save, CreditCard, Check, ShieldAlert, AlertTriangle, Clock, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase"; // Make sure this import exists
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui-components";
import { useToast } from "@/hooks/use-toast";
import { KycFormData, DocumentType } from '@/types/kyc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subYears } from "date-fns"; // Add this import
import { countries } from "@/data/countries"; // Add this import at the top

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

const Profile = () => {
  const { toast } = useToast();
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
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
    lastLogin: "",
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
  const [countries, setCountries] = useState<Array<{code: string, name: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [cityError, setCityError] = useState("");
  const [postalError, setPostalError] = useState("");

  // Add validation states
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [fileError, setFileError] = useState("");

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferrerName(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      // First get current user's referral code
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      // Check if user is trying to use their own code
      if (currentUser?.referral_code === code) {
        setReferrerName(null);
        toast({
          title: "Invalid Code",
          description: "You cannot use your own referral code",
          variant: "destructive",
        });
        return;
      }

      // Proceed with normal validation
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('referral_code', code)
        .single();

      if (error || !data) {
        setReferrerName(null);
      } else {
        setReferrerName(data.full_name);
      }
    } catch (error) {
      setReferrerName(null);
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
      // 1. Auth User Check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(authError?.message || 'No authenticated user found');

      // 2. Profile Data Fetch
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
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
          last_login,
          status,
          referred_by
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // 3. Data Mapping
      setUserData({
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: profile?.email ?? user.email ?? "",
        phone: profile?.phone ?? "",
        address: profile?.address ?? "",
        city: profile?.city ?? "",
        country: profile?.country ?? "",
        kycStatus: profile?.kyc_status || 'pending',
        fullName: profile?.full_name ?? "",
        dateJoined: profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : new Date().toLocaleDateString(),
        lastLogin: profile?.last_login ? new Date(profile.last_login).toLocaleDateString() : "Never",
        status: profile?.status ?? "active",
        referred_by: profile?.referred_by ?? ""
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

  // Replace the fetchCountries function
  const fetchCountries = async () => {
    try {
      // Using local country data instead of API
      const formattedCountries = countries.sort((a, b) => a.name.localeCompare(b.name));
      setCountries(formattedCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
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

  useEffect(() => {
    fetchProfile();
    fetchCountries();
  }, []);

  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPersonal(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const form = e.target as HTMLFormElement;
      const updates = {
        first_name: form.firstName.value,
        last_name: form.lastName.value,
        email: form.email.value,
        phone: form.phone.value,
        address: form.address.value,
        city: form.city.value,
        country: form.country.value,
        updated_at: new Date().toISOString()
      };

      console.log('Updating profile with:', updates);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile data after update
      await fetchProfile();

      toast({
        title: "Profile Updated",
        description: "Your personal information has been updated successfully.",
      });
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

  const handleSecurityUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSecurity(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Security Settings Updated",
        description: "Your security settings have been updated successfully.",
      });
      setIsUpdatingSecurity(false);
    }, 1000);
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

      // Upload front document
      const frontFileName = `${user.id}/front_${Date.now()}.${kycFormData.document_front.name.split('.').pop()}`;
      const { error: frontError } = await supabase.storage
        .from('kyc_documents')
        .upload(frontFileName, kycFormData.document_front);
      if (frontError) throw frontError;

      // Upload back document
      const backFileName = `${user.id}/back_${Date.now()}.${kycFormData.document_back.name.split('.').pop()}`;
      const { error: backError } = await supabase.storage
        .from('kyc_documents')
        .upload(backFileName, kycFormData.document_back);
      if (backError) throw backError;

      // Get public URLs
      const frontUrl = supabase.storage.from('kyc_documents').getPublicUrl(frontFileName).data.publicUrl;
      const backUrl = supabase.storage.from('kyc_documents').getPublicUrl(backFileName).data.publicUrl;

      // Create or update KYC record with all form data
      const { error: kycError } = await supabase
        .from('kyc')
        .upsert({
          user_id: user.id,
          document_front: frontUrl,
          document_back: backUrl,
          status: 'pending', // Changed from 'processing' to 'pending'
          ...kycFormData,
          updated_at: new Date().toISOString()
        });

      if (kycError) throw kycError;

      // Update profile KYC status to processing (this table allows 'processing' status)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'processing' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Verification Submitted",
        description: "Your documents have been submitted for verification. This usually takes 1-2 business days.",
      });

      // Reset form
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
        description: error.message || "Failed to submit verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingKYC(false);
    }
  };

  return (
    <ShellLayout>
      <PageHeader 
        title="Profile & Settings" 
        description="Manage your personal information and account settings"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="personal" className="space-y-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[280px,1fr]">
            {/* Vertical Tab List */}
            <div className="space-y-1">
              <TabsList className="flex flex-col h-auto w-full bg-muted p-1 gap-1">
                <TabsTrigger 
                  value="personal" 
                  className="w-full justify-start gap-2 px-3"
                >
                  <User className="h-4 w-4" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger 
                  value="kyc" 
                  className="w-full justify-start gap-2 px-3"
                >
                  <Shield className="h-4 w-4" />
                  KYC Verification
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="w-full justify-start gap-2 px-3"
                >
                  <Lock className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              <TabsContent value="personal" className="space-y-6 m-0">
                <Card>
                  <form onSubmit={handlePersonalInfoUpdate}>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input 
                            id="firstName" 
                            name="firstName"
                            defaultValue={userData.firstName} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input 
                            id="lastName" 
                            name="lastName"
                            defaultValue={userData.lastName} 
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            name="email"
                            type="email" 
                            defaultValue={userData.email} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            name="phone"
                            defaultValue={userData.phone} 
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input 
                            id="address" 
                            name="address"
                            defaultValue={userData.address} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input 
                            id="city" 
                            name="city"
                            defaultValue={userData.city} 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input 
                          id="country" 
                          name="country"
                          defaultValue={userData.country} 
                        />
                      </div>

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
                        <div className="space-y-2 pt-4 border-t">
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
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isUpdatingPersonal}>
                        {isUpdatingPersonal ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              <TabsContent value="kyc" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>KYC Verification</CardTitle>
                    <CardDescription>
                      Complete identity verification to unlock full platform features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isLoadingKyc ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : userData.kycStatus === 'completed' ? (
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-green-800">Verification Complete</h3>
                            <p className="text-sm text-green-700">
                              Your identity has been verified successfully. You now have full access to all platform features.
                            </p>
                            {kycData && kycData.updated_at && (
                              <div className="mt-3 flex gap-2 text-xs text-green-700">
                                <span className="flex items-center gap-1">
                                  <ShieldAlert className="h-4 w-4" />
                                  Verified on {new Date(kycData.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : userData.kycStatus === 'processing' ? (
                      <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-yellow-800">Verification In Progress</h3>
                            <p className="text-sm text-yellow-700">
                              Your documents are being reviewed. This usually takes 1-2 business days.
                            </p>
                            {kycData && (
                              <div className="mt-3 flex gap-2 text-xs text-yellow-700">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Submitted on {new Date(kycData.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : userData.kycStatus === 'rejected' ? (
                      <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-red-800">Verification Rejected</h3>
                            <p className="text-sm text-red-700">
                              Your verification was not successful. Please submit new documents following the guidelines below.
                            </p>
                            {kycData && kycData.updated_at && (
                              <div className="mt-3 flex gap-2 text-xs text-red-700">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Rejected on {new Date(kycData.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-blue-800">Verification Required</h3>
                            <p className="text-sm text-blue-700">
                              Please complete your KYC verification to unlock all platform features.
                            </p>
                          </div>
                        </div>
                      </div>
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
                            <div>
                              <h3 className="text-lg font-medium">1. Personal Details</h3>
                              <p className="text-sm text-muted-foreground">Provide your basic information</p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="full_name">Full Name (as per document)</Label>
                              <Input
                                id="full_name"
                                value={kycFormData.full_name}
                                onChange={handleNameChange}
                                className={nameError ? "border-red-500" : ""}
                              />
                              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="date_of_birth">Date of Birth</Label>
                              <Input
                                id="date_of_birth"
                                type="date"
                                max={format(subYears(new Date(), 16), 'yyyy-MM-dd')}
                                value={kycFormData.date_of_birth}
                                onChange={handleDobChange}
                                className={dobError ? "border-red-500" : ""}
                              />
                              {dobError && <p className="text-xs text-red-500">{dobError}</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address">Residential Address</Label>
                            <Input
                              id="address"
                              value={kycFormData.address}
                              onChange={(e) => setKycFormData(prev => ({...prev, address: e.target.value}))}
                              placeholder="Enter your full residential address"
                              className="w-full"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="country">Country</Label>
                              <Input
                                id="country"
                                type="text"
                                placeholder="Enter your country"
                                value={kycFormData.country}
                                onChange={(e) => setKycFormData(prev => ({
                                  ...prev,
                                  country: e.target.value
                                }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="state">State/Province</Label>
                              <Input
                                id="state"
                                value={kycFormData.state}
                                onChange={(e) => setKycFormData(prev => ({...prev, state: e.target.value}))}
                                placeholder="Enter state or province"
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                value={kycFormData.city}
                                onChange={(e) => handleCityChange(e.target.value)}
                                placeholder="Enter city name"
                                className={cityError ? "border-red-500" : ""}
                              />
                              {cityError && <p className="text-xs text-red-500">{cityError}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="postal_code">Postal Code</Label>
                              <Input
                                id="postal_code"
                                value={kycFormData.postal_code}
                                onChange={(e) => handlePostalChange(e.target.value)}
                                placeholder="Enter postal code"
                                className={postalError ? "border-red-500" : ""}
                              />
                              {postalError && <p className="text-xs text-red-500">{postalError}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Document Identification Section */}
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium">2. Document Identification</h3>
                              <p className="text-sm text-muted-foreground">Provide your identification details</p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="document_type">Document Type</Label>
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
                              <Label htmlFor="document_number">Document Number</Label>
                              <Input
                                id="document_number"
                                value={kycFormData.document_number}
                                onChange={(e) => setKycFormData(prev => ({...prev, document_number: e.target.value}))}
                                placeholder="Enter document number"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input
                              id="occupation"
                              value={kycFormData.occupation}
                              onChange={(e) => setKycFormData(prev => ({...prev, occupation: e.target.value}))}
                              placeholder="Enter your occupation"
                            />
                          </div>
                        </div>

                        {/* Document Upload Section */}
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Upload className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium">3. Document Upload</h3>
                              <p className="text-sm text-muted-foreground">Upload your identification documents</p>
                            </div>
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
                              <Label htmlFor="idFront">Document Front</Label>
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
                              <Label htmlFor="idBack">Document Back</Label>
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
                  </CardContent>
                  {/* Update button visibility condition */}
                  {(userData.kycStatus === 'rejected' || userData.kycStatus === 'pending' || !userData.kycStatus) && (
                    <CardFooter>
                      <Button 
                        onClick={handleSubmitKYC} 
                        disabled={isSubmittingKYC || !selectedFiles.front || !selectedFiles.back}
                        className={userData.kycStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        {isSubmittingKYC ? (
                          <>Processing...</>
                        ) : (
                          <>{userData.kycStatus === 'rejected' ? 'Submit Again' : 'Submit for Verification'}</>
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <form onSubmit={handleSecurityUpdate}>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>
                        Manage your password and security preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input id="newPassword" type="password" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input id="confirmPassword" type="password" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isUpdatingSecurity}>
                        {isUpdatingSecurity ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      )}
    </ShellLayout>
  );
};

export default Profile;

