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
    document_back: null
  });

  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [kycData, setKycData] = useState<any>(null);

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
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication failed');
      }
      if (!user) throw new Error('No authenticated user found');

      console.log('Auth user found:', user.id);

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

      if (profileError) {
        console.error('Profile fetch error:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details
        });
        throw profileError;
      }

      console.log('Profile data received:', {
        hasProfile: !!profile,
        fields: profile ? Object.keys(profile) : []
      });

      // 3. Data Mapping with Validation
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

      console.log('Profile data mapped successfully');

      // After setting userData, fetch referrer name if exists
      if (profile?.referred_by) {
        const referrerName = await fetchReferrerName(profile.referred_by);
        setCurrentReferrerName(referrerName);
      }

      // Fetch KYC data
      const { data: kycData, error: kycError } = await supabase
        .from('kyc')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!kycError && kycData) {
        setKycData(kycData);
        // Update KYC form data with existing values
        setKycFormData({
          full_name: kycData.full_name || "",
          date_of_birth: kycData.date_of_birth || "",
          address: kycData.address || "",
          city: kycData.city || "",
          state: kycData.state || "",
          country: kycData.country || "",
          document_type: kycData.document_type || "passport",
          document_number: kycData.document_number || "",
          document_front: null,
          document_back: null
        });
      }

      // If there's a mismatch between profile and KYC status, sync them
      if (profile?.kyc_status !== kycData?.status) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ kyc_status: kycData?.status || 'pending' })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to sync KYC status:', updateError);
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

  useEffect(() => {
    fetchProfile();
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
          status: 'processing',
          ...kycFormData,
          updated_at: new Date().toISOString()
        });

      if (kycError) throw kycError;

      // Update profile KYC status to processing
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
        document_back: null
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
          <TabsList>
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2">
              <Shield className="h-4 w-4" />
              KYC Verification
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
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
                              Invalid referral code
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
                {/* KYC Status Banner */}
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
                        {kycData && (
                          <div className="mt-3 flex gap-2 text-xs text-green-700">
                            <span className="flex items-center gap-1">
                              <ShieldAlert className="h-4 w-4" />
                              Verified on {new Date(kycData.approved_at).toLocaleDateString()}
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
                          {kycData?.rejection_reason || 'Your verification was not successful. Please submit new documents following the guidelines below.'}
                        </p>
                        {kycData && (
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

                {/* Show upload form only for rejected states */}
                {(userData.kycStatus === 'rejected') && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name (as per document)</Label>
                        <Input
                          id="full_name"
                          value={kycFormData.full_name}
                          onChange={(e) => setKycFormData(prev => ({...prev, full_name: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={kycFormData.date_of_birth}
                          onChange={(e) => setKycFormData(prev => ({...prev, date_of_birth: e.target.value}))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Show initial upload form for new submissions */}
                {(!userData.kycStatus || userData.kycStatus === 'pending') && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name (as per document)</Label>
                        <Input
                          id="full_name"
                          value={kycFormData.full_name}
                          onChange={(e) => setKycFormData(prev => ({...prev, full_name: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={kycFormData.date_of_birth}
                          onChange={(e) => setKycFormData(prev => ({...prev, date_of_birth: e.target.value}))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address (as per document)</Label>
                      <Input
                        id="address"
                        value={kycFormData.address}
                        onChange={(e) => setKycFormData(prev => ({...prev, address: e.target.value}))}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={kycFormData.city}
                          onChange={(e) => setKycFormData(prev => ({...prev, city: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={kycFormData.state}
                          onChange={(e) => setKycFormData(prev => ({...prev, state: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={kycFormData.country}
                          onChange={(e) => setKycFormData(prev => ({...prev, country: e.target.value}))}
                        />
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
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idFront">Document Front</Label>
                      <Input 
                        id="idFront" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          handleFileSelect('front', e.target.files?.[0] || null);
                          setKycFormData(prev => ({...prev, document_front: e.target.files?.[0] || null}));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idBack">Document Back</Label>
                      <Input 
                        id="idBack" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          handleFileSelect('back', e.target.files?.[0] || null);
                          setKycFormData(prev => ({...prev, document_back: e.target.files?.[0] || null}));
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              {(userData.kycStatus === 'rejected' || !userData.kycStatus) && (
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

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Enable 2FA</div>
                        <div className="text-sm text-muted-foreground">Add an extra layer of security to your account</div>
                      </div>
                      <Button variant="outline">Setup</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Session Management</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Active Sessions</div>
                        <div className="text-sm text-muted-foreground">View and manage your active sessions</div>
                      </div>
                      <Button variant="outline">View</Button>
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

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about account activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-medium">Security Alerts</h3>
                      <p className="text-sm text-muted-foreground">Login attempts, password changes, etc.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                        <span className="text-sm">SMS</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-medium">Investment Updates</h3>
                      <p className="text-sm text-muted-foreground">ROI payments, investment maturity, etc.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" />
                        <span className="text-sm">SMS</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-medium">Affiliate Activity</h3>
                      <p className="text-sm text-muted-foreground">New referrals, commission payments, etc.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" defaultChecked />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" />
                        <span className="text-sm">SMS</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-medium">Promotional Offers</h3>
                      <p className="text-sm text-muted-foreground">New investment plans, special deals, etc.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" />
                        <span className="text-sm">SMS</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </ShellLayout>
  );
};

export default Profile;

