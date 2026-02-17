import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useProfileCompletion } from '@/context/ProfileCompletionContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, Phone, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { DatePicker } from '@/components/ui/date-picker';

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  phone_number: z.string().trim().min(7, 'Please enter a valid phone number').max(20, 'Phone number is too long'),
  birthday: z.string().min(1, 'Birthday is required'),
  home_address: z.string().trim().min(10, 'Please enter your complete address').max(500, 'Address is too long'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileCompletionModal() {
  const { user } = useAuth();
  const { showProfileModal, markProfileComplete, refreshProfileStatus, isProfileComplete } = useProfileCompletion();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    phone_number: '',
    birthday: '',
    home_address: '',
  });

  // Load existing profile data if any
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user?.email || !showProfileModal) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('agent_profiles')
          .select('full_name, phone_number, birthday, home_address')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (!error && data) {
          setFormData({
            full_name: data.full_name || '',
            phone_number: data.phone_number || '',
            birthday: data.birthday || '',
            home_address: data.home_address || '',
          });
        } else {
          // Pre-fill name from user metadata if available
          setFormData(prev => ({
            ...prev,
            full_name: user.name || '',
          }));
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [user?.email, showProfileModal]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      profileSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as keyof ProfileFormData;
          newErrors[field] = error.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user?.email) return;
    
    if (!validateForm()) {
      toast({
        title: 'Please fix the errors',
        description: 'Some required fields are missing or invalid.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const userEmail = user.email.toLowerCase();
      const profileData = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        birthday: formData.birthday,
        home_address: formData.home_address.trim(),
        updated_at: new Date().toISOString(),
      };

      // Check if profile row already exists
      const { data: existing, error: selectError } = await supabase
        .from('agent_profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (selectError) {
        console.error('[ProfileCompletion] Select error:', JSON.stringify(selectError));
        // Abort save – re-check if profile is already complete
        await refreshProfileStatus();
        markProfileComplete();
        return;
      }

      let saveError: any = null;

      if (existing) {
        // UPDATE existing row
        const { error } = await supabase
          .from('agent_profiles')
          .update(profileData)
          .eq('email', userEmail);
        saveError = error;
      } else {
        // INSERT new row
        const { error } = await supabase
          .from('agent_profiles')
          .insert({ email: userEmail, ...profileData });
        saveError = error;
      }

      if (saveError) {
        console.error('[ProfileCompletion] Save error:', JSON.stringify(saveError));
        // Re-check and force-close if profile is actually complete
        await refreshProfileStatus();
        markProfileComplete();
        return;
      }

      toast({
        title: 'Profile completed!',
        description: 'Welcome to the portal. You can update your full profile anytime.',
      });
      
      markProfileComplete();
    } catch (err) {
      console.error('[ProfileCompletion] Unexpected error:', err);
      // Re-check and force-close if profile is actually complete
      await refreshProfileStatus();
      markProfileComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = formData.full_name.trim().length >= 2 && 
                      formData.phone_number.trim().length >= 7 && 
                      formData.birthday && 
                      formData.home_address.trim().length >= 10;

  return (
    <Dialog open={showProfileModal} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
              <DialogDescription className="mt-1">
                Please provide these details to continue using the portal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                className={errors.full_name ? 'border-destructive' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className={errors.phone_number ? 'border-destructive' : ''}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number}</p>
              )}
            </div>

            {/* Birthday */}
            <div className="space-y-2">
              <Label htmlFor="birthday" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Birthday <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="birthday"
                value={formData.birthday}
                onChange={(value) => handleInputChange('birthday', value)}
                placeholder="Select your birthday"
                className={errors.birthday ? 'border-destructive' : ''}
              />
              {errors.birthday && (
                <p className="text-sm text-destructive">{errors.birthday}</p>
              )}
            </div>

            {/* Home Address */}
            <div className="space-y-2">
              <Label htmlFor="home_address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Home Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="home_address"
                value={formData.home_address}
                onChange={(e) => handleInputChange('home_address', e.target.value)}
                placeholder="Enter your complete home address"
                rows={2}
                className={errors.home_address ? 'border-destructive' : ''}
              />
              {errors.home_address && (
                <p className="text-sm text-destructive">{errors.home_address}</p>
              )}
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={isSaving || !isFormValid}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Profile
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                You can update your full profile including additional details later.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
