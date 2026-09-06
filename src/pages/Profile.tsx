import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Building, 
  Home, 
  CheckCircle2, 
  Camera, 
  Trash2, 
  Edit3, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertCircle, 
  KeyRound, 
  Shield, 
  Check, 
  Sparkles,
  Info,
  HeartHandshake,
  UserCheck
} from 'lucide-react';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../api/user';
import { profileEditSchema, type ProfileEditDTO } from '../types/user';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, ErrorState } from '../components';
import { formatDate } from '../lib';
import { cn } from '@/lib/cn';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function Profile() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { profilePicture, setProfilePicture, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: getCurrentUserProfile,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileEditDTO>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      ownerName: '',
      email: '',
      mobileNumber: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      userAddress: {
        houseNo: '',
        societyName: '',
        area: '',
        city: '',
        pincode: '',
        state: '',
        country: 'India',
      },
    },
  });

  // Populate form fields whenever profile query data loads or changes
  useEffect(() => {
    if (profile) {
      reset({
        ownerName: profile.ownerName || '',
        email: profile.email || '',
        mobileNumber: profile.mobileNumber || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        userAddress: {
          houseNo: profile.userAddress?.houseNo || '',
          societyName: profile.userAddress?.societyName || '',
          area: profile.userAddress?.area || '',
          city: profile.userAddress?.city || '',
          pincode: profile.userAddress?.pincode || '',
          state: profile.userAddress?.state || '',
          country: profile.userAddress?.country || 'India',
        },
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileEditDTO) => {
      const payload: any = {
        ownerName: data.ownerName.trim(),
        email: data.email.trim(),
        mobileNumber: data.mobileNumber.trim(),
        userAddress: {
          houseNo: data.userAddress.houseNo.trim(),
          societyName: data.userAddress.societyName.trim(),
          area: data.userAddress.area.trim(),
          city: data.userAddress.city.trim(),
          pincode: data.userAddress.pincode.trim(),
          state: data.userAddress.state.trim(),
          country: data.userAddress.country?.trim() || 'India',
        },
      };

      if (data.newPassword && data.newPassword.trim().length > 0) {
        payload.currentPassword = data.currentPassword?.trim();
        payload.newPassword = data.newPassword.trim();
      }

      return updateCurrentUserProfile(payload);
    },
    onSuccess: (updatedUser) => {
      updateUser({
        ownerName: updatedUser.ownerName,
        email: updatedUser.email,
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully.');
      setIsEditing(false);
      reset((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to update profile.';
      toast.error(message);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    // Validate MIME Type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const msg = 'Unsupported file format. Please upload a JPG, PNG, or WebP image.';
      setImageError(msg);
      toast.error(msg);
      e.target.value = '';
      return;
    }

    // Validate File Size (max 2 MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const actualMb = (file.size / (1024 * 1024)).toFixed(2);
      const msg = `Selected image size (${actualMb} MB) exceeds the maximum allowed limit of 2 MB. Please select a smaller photo.`;
      setImageError(msg);
      toast.error(`Image exceeds 2 MB limit (${actualMb} MB).`);
      e.target.value = '';
      return;
    }

    // Read and store as Data URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfilePicture(result);
      toast.success('Profile picture updated successfully.');
      setImageError(null);
    };
    reader.onerror = () => {
      const msg = 'Failed to read image file from device. Please try again.';
      setImageError(msg);
      toast.error(msg);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    setImageError(null);
    toast.info('Profile picture removed.');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setImageError(null);
    if (profile) {
      reset({
        ownerName: profile.ownerName || '',
        email: profile.email || '',
        mobileNumber: profile.mobileNumber || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        userAddress: {
          houseNo: profile.userAddress?.houseNo || '',
          societyName: profile.userAddress?.societyName || '',
          area: profile.userAddress?.area || '',
          city: profile.userAddress?.city || '',
          pincode: profile.userAddress?.pincode || '',
          state: profile.userAddress?.state || '',
          country: profile.userAddress?.country || 'India',
        },
      });
    }
  };

  const onSubmit = (data: ProfileEditDTO) => {
    updateMutation.mutate(data);
  };

  // Watch password inputs for live feedback
  const watchNewPassword = watch('newPassword') || '';
  const watchConfirmPassword = watch('confirmPassword') || '';

  const hasNewPassword = watchNewPassword.trim().length > 0;
  const isLengthValid = watchNewPassword.length >= 8 && watchNewPassword.length <= 20;
  const hasUppercase = /[A-Z]/.test(watchNewPassword);
  const hasLowercase = /[a-z]/.test(watchNewPassword);
  const hasNumber = /[0-9]/.test(watchNewPassword);
  const hasSpecial = /[@#$%^&+=!]/.test(watchNewPassword);
  const passwordsMatch = hasNewPassword && watchNewPassword === watchConfirmPassword;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader title="My Profile" />
        <div className="animate-pulse space-y-6">
          <div className="h-56 bg-gray-200/80 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 bg-gray-200/80 rounded-2xl"></div>
            <div className="h-72 bg-gray-200/80 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader title="My Profile" />
        <ErrorState message={(error as any)?.message || 'Failed to load profile details.'} onRetry={() => refetch()} />
      </div>
    );
  }

  const initial = (profile.ownerName || profile.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Profile' },
        ]}
      />

      {/* Inline Image Validation Alert */}
      {imageError && (
        <div className="bg-red-50 border border-red-200/90 rounded-xl p-4 flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Image Validation Error</h4>
              <p className="text-sm text-red-700 mt-0.5">{imageError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100 transition-colors"
            title="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero Profile Banner Card */}
      <div className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs overflow-hidden">
        {/* Cover backdrop */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-slate-900 via-[#0a2720] to-[#0F7B5C] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white/90 text-xs font-medium border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Verified Enterprise Account
          </div>
        </div>

        {/* Profile Card Header Body */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
            {/* Avatar with Camera Overlay */}
            <div className="relative group">
              <div className="relative">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={profile.ownerName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white dark:ring-[#141A24] shadow-xl bg-white dark:bg-[#141A24]"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[var(--color-primary)] text-white font-serif font-bold text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white dark:ring-[#141A24] shadow-xl">
                    {initial}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#141A24]" />
              </div>

              {/* Camera Upload Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-[#1E2837] text-gray-700 dark:text-slate-200 hover:text-[var(--color-primary)] rounded-xl shadow-lg border border-gray-200 dark:border-[#283548] hover:border-emerald-400 transition-all hover:scale-105 cursor-pointer"
                title="Change profile picture (Max 2 MB)"
                id="upload-avatar-button"
              >
                <Camera className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
                id="profile-picture-input"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3">
              {profilePicture && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePicture}
                  className="text-red-600 dark:text-rose-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-rose-950/40 border-gray-200 dark:border-[#1F2837]"
                  title="Remove uploaded picture"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove Photo
                </Button>
              )}

              {!isEditing ? (
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  id="edit-profile-btn"
                  className="shadow-sm font-medium"
                >
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    id="cancel-edit-btn"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="profile-edit-form"
                    isLoading={updateMutation.isPending}
                    id="save-profile-btn"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* User Identity Details */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 dark:text-slate-100">
                {profile.ownerName || profile.username}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                {profile.role === 'ADMIN' && (
                  <Badge variant="danger">
                    Administrator
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {profile.enabled ? 'Active Account' : 'Disabled'}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">@{profile.username}</p>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-gray-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0E131C] px-2.5 py-1 rounded-lg border border-gray-100 dark:border-[#1F2837]">
                <Mail className="h-3.5 w-3.5 text-gray-400 dark:text-slate-400" />
                {profile.email}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0E131C] px-2.5 py-1 rounded-lg border border-gray-100 dark:border-[#1F2837]">
                <Phone className="h-3.5 w-3.5 text-gray-400 dark:text-slate-400" />
                {profile.mobileNumber}
              </span>
              {profile.createdAt && (
                <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#0E131C] px-2.5 py-1 rounded-lg border border-gray-100 dark:border-[#1F2837]">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-slate-400" />
                  Member since {formatDate(profile.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Body */}
      {isEditing ? (
        /* Edit Mode Form */
        <form id="profile-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Editable Personal Details */}
            <Card className="border-gray-200/90 shadow-xs">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <User className="h-4 w-4 text-[var(--color-primary)]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Input
                  label="Owner / Full Name"
                  id="ownerName"
                  placeholder="e.g. Rajesh Kumar"
                  error={errors.ownerName?.message}
                  {...register('ownerName')}
                  autoSelectOnFocus
                />

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={profile.username}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100/80 px-3 py-2 text-sm text-gray-500 font-mono cursor-not-allowed pr-10"
                    />
                    <Lock className="h-4 w-4 text-gray-400 absolute right-3 top-2.5" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Permanent username handle (cannot be changed)
                  </p>
                </div>

                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  error={errors.email?.message}
                  {...register('email')}
                  autoSelectOnFocus
                />

                <Input
                  label="Mobile Number (10-Digit Indian Mobile)"
                  id="mobileNumber"
                  placeholder="9824477701"
                  maxLength={10}
                  error={errors.mobileNumber?.message}
                  {...register('mobileNumber')}
                  autoSelectOnFocus
                />
              </CardContent>
            </Card>

            {/* Editable Registered Address */}
            <Card className="border-gray-200/90 shadow-xs">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                  Registered Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="House / Flat No."
                    id="houseNo"
                    placeholder="e.g. 102, Block B"
                    error={errors.userAddress?.houseNo?.message}
                    {...register('userAddress.houseNo')}
                    autoSelectOnFocus
                  />
                  <Input
                    label="Society / Building"
                    id="societyName"
                    placeholder="e.g. Shivalik Residency"
                    error={errors.userAddress?.societyName?.message}
                    {...register('userAddress.societyName')}
                    autoSelectOnFocus
                  />
                </div>

                <Input
                  label="Area / Locality"
                  id="area"
                  placeholder="e.g. Sarthana Jakatnaka"
                  error={errors.userAddress?.area?.message}
                  {...register('userAddress.area')}
                  autoSelectOnFocus
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    id="city"
                    placeholder="e.g. Surat"
                    error={errors.userAddress?.city?.message}
                    {...register('userAddress.city')}
                    autoSelectOnFocus
                  />
                  <Input
                    label="State"
                    id="state"
                    placeholder="e.g. Gujarat"
                    error={errors.userAddress?.state?.message}
                    {...register('userAddress.state')}
                    autoSelectOnFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Pincode (6-digit Indian PIN)"
                    id="pincode"
                    placeholder="e.g. 395006"
                    maxLength={6}
                    error={errors.userAddress?.pincode?.message}
                    {...register('userAddress.pincode')}
                    autoSelectOnFocus
                  />
                  <Input
                    label="Country"
                    id="country"
                    placeholder="India"
                    error={errors.userAddress?.country?.message}
                    {...register('userAddress.country')}
                    autoSelectOnFocus
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Password Change Card (Security) */}
          <Card className="border-gray-200/90 shadow-xs">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <KeyRound className="h-4 w-4 text-[var(--color-primary)]" />
                  Security & Password
                </CardTitle>
                <span className="text-xs text-gray-400">Optional: leave empty to keep existing password</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--color-text-sub)]">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                      id="currentPassword"
                      error={errors.currentPassword?.message}
                      {...register('currentPassword')}
                      autoSelectOnFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-hidden"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--color-text-sub)]">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter strong new password"
                      id="newPassword"
                      error={errors.newPassword?.message}
                      {...register('newPassword')}
                      autoSelectOnFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-hidden"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--color-text-sub)]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      id="confirmPassword"
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword')}
                      autoSelectOnFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-hidden"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Password Complexity Feedback */}
              {hasNewPassword && (
                <div className="bg-gray-50/90 rounded-xl p-4 border border-gray-200/80 space-y-2 animate-in fade-in duration-150">
                  <p className="text-xs font-semibold text-gray-700">Password Requirements:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <span className={cn("flex items-center gap-1.5", isLengthValid ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {isLengthValid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      8–20 characters
                    </span>
                    <span className={cn("flex items-center gap-1.5", hasUppercase ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {hasUppercase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      1 uppercase letter (A-Z)
                    </span>
                    <span className={cn("flex items-center gap-1.5", hasLowercase ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {hasLowercase ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      1 lowercase letter (a-z)
                    </span>
                    <span className={cn("flex items-center gap-1.5", hasNumber ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {hasNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      1 numeric digit (0-9)
                    </span>
                    <span className={cn("flex items-center gap-1.5", hasSpecial ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {hasSpecial ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      1 special char (@#$%^&+=!)
                    </span>
                    <span className={cn("flex items-center gap-1.5", passwordsMatch ? "text-emerald-700 font-medium" : "text-gray-500")}>
                      {passwordsMatch ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                      Passwords match
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Action Controls */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </form>
      ) : (
        /* View Mode */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details Card */}
            <Card className="border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <CardHeader className="border-b border-gray-100 dark:border-[#1F2837] bg-gray-50/50 dark:bg-[#141A24]/60">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm divide-y divide-gray-100 dark:divide-[#1F2837]">
                <div className="flex justify-between items-center py-2 first:pt-0">
                  <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Owner Name
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{profile.ownerName || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Username Handle
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-slate-200 bg-gray-100 dark:bg-[#0E131C] px-2 py-0.5 rounded-md text-xs border border-transparent dark:border-[#1F2837]">
                    @{profile.username}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Email Address
                  </span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">{profile.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Mobile Number
                  </span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">{profile.mobileNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2 last:pb-0">
                  <span className="text-gray-500 dark:text-slate-400">Account Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-900/40">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Active & Verified
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Registered Address Card */}
            <Card className="border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <CardHeader className="border-b border-gray-100 dark:border-[#1F2837] bg-gray-50/50 dark:bg-[#141A24]/60">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-100">
                  <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                  Registered Address
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm divide-y divide-gray-100 dark:divide-[#1F2837]">
                {profile.userAddress ? (
                  <>
                    <div className="flex justify-between items-center py-2 first:pt-0">
                      <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-400 dark:text-slate-500" /> House / Flat No.
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{profile.userAddress.houseNo || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400 dark:text-slate-500" /> Society / Building
                      </span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{profile.userAddress.societyName || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500 dark:text-slate-400">Area / Locality</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{profile.userAddress.area || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500 dark:text-slate-400">City & State</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {profile.userAddress.city || '-'}, {profile.userAddress.state || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500 dark:text-slate-400">Pincode</span>
                      <span className="font-mono font-medium text-gray-900 dark:text-slate-100">{profile.userAddress.pincode || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 last:pb-0">
                      <span className="text-gray-500 dark:text-slate-400">Country</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{profile.userAddress.country || 'India'}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-slate-400 italic py-4">No address information registered.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Security & Account Protection Card */}
          <Card className="border-gray-200/90 dark:border-[#1F2837] shadow-xs">
            <CardHeader className="border-b border-gray-100 dark:border-[#1F2837] bg-gray-50/50 dark:bg-[#141A24]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-slate-100 font-serif">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Security & Account Protection Overview
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-900/40 w-fit">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Account & Data Protected
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* 4 Clear Security Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Account Protection */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0E131C] border border-slate-200/80 dark:border-[#1F2837] hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Account Protection
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Your account is protected by private login credentials. You can safely update your password anytime directly from this profile page.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#1F2837] flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Safe Login Credentials
                  </div>
                </div>

                {/* 2. Business Data Security */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0E131C] border border-slate-200/80 dark:border-[#1F2837] hover:border-blue-300 dark:hover:border-blue-800/60 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
                        <Shield className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Safe Business Records
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      All your daily sales, purchase bills, inventory, payments, and expense entries are safely stored to protect against unauthorized changes or data loss.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#1F2837] flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                    <CheckCircle2 className="h-3 w-3" /> Records Safeguarded
                  </div>
                </div>

                {/* 3. Controlled & Private Access */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0E131C] border border-slate-200/80 dark:border-[#1F2837] hover:border-purple-300 dark:hover:border-purple-800/60 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="p-2 rounded-lg bg-purple-100/70 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Authorized Access Only
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Only authorized users can access the information they are permitted to see. Your business information is strictly confidential and never open to other users.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#1F2837] flex items-center gap-1.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                    <CheckCircle2 className="h-3 w-3" /> Strictly Private & Isolated
                  </div>
                </div>

                {/* 4. Active Safeguards */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0E131C] border border-slate-200/80 dark:border-[#1F2837] hover:border-amber-300 dark:hover:border-amber-800/60 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        Active Safeguards
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      Continuous safety checks and protected connections operate behind the scenes to safeguard your everyday business operations.
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#1F2837] flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <CheckCircle2 className="h-3 w-3" /> Continuous Protection
                  </div>
                </div>
              </div>

              {/* Personal Owner Support Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-slate-50/70 dark:from-[#0c221a] dark:via-[#0f2228] dark:to-[#121a24] border border-emerald-200/80 dark:border-emerald-800/50 p-5 sm:p-6 transition-all shadow-xs">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-[#141A24] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-100 dark:border-emerald-900/60 shrink-0 mt-0.5">
                      <HeartHandshake className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                          Personal Support from the Application Owner
                        </h4>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Always Here to Help
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        You are never alone when managing your business on <strong>व्यापार</strong>. If you ever have questions about your account security, need guidance with your daily entries, or face any issue while using the system, the application owner is readily available to personally assist and guide you. Please feel free to reach out anytime you need support.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 self-start md:self-center">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#141A24] border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Direct Owner Assistance
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
