import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User } from 'lucide-react';
import { fetchMyProfile, upsertProfile, AgentProfile, AgentProfileInput, RateHistoryEntry } from '@/lib/agentProfileApi';
import { DollarSign } from 'lucide-react';
import { getAgentInfoByEmail } from '@/lib/agentDirectory';

export default function AgentProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const emptyRateHistory = Array(6).fill({ date: '', rate: '' });
  
  const [profile, setProfile] = useState<AgentProfileInput>({
    email: '',
    full_name: '',
    phone_number: '',
    birthday: '',
    start_date: '',
    home_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    position: '',
    team_lead: '',
    clients: '',
    hourly_rate: null,
    rate_history: []
  });
  
  const [rateHistoryUI, setRateHistoryUI] = useState<{ date: string; rate: string }[]>(emptyRateHistory);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    const result = await fetchMyProfile();
    
    if (result.data) {
      setProfile({
        email: result.data.email,
        full_name: result.data.full_name || '',
        phone_number: result.data.phone_number || '',
        birthday: result.data.birthday || '',
        start_date: result.data.start_date || '',
        home_address: result.data.home_address || '',
        emergency_contact_name: result.data.emergency_contact_name || '',
        emergency_contact_phone: result.data.emergency_contact_phone || '',
        position: result.data.position || '',
        team_lead: result.data.team_lead || '',
        clients: result.data.clients || '',
        hourly_rate: result.data.hourly_rate,
        rate_history: result.data.rate_history || []
      });
      
      // Populate rate history UI
      const existingHistory = result.data.rate_history || [];
      const historyUI = Array(6).fill(null).map((_, i) => ({
        date: existingHistory[i]?.date || '',
        rate: existingHistory[i]?.rate?.toString() || ''
      }));
      setRateHistoryUI(historyUI);
    } else {
      // Pre-fill from directory if available
      const agentInfo = getAgentInfoByEmail(user.email);
      setProfile({
        email: user.email.toLowerCase(),
        full_name: agentInfo?.name || user.name || '',
        phone_number: '',
        birthday: '',
        start_date: '',
        home_address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        position: agentInfo?.position || '',
        team_lead: agentInfo?.teamLead || '',
        clients: agentInfo?.clients.join(', ') || '',
        hourly_rate: null,
        rate_history: []
      });
      setRateHistoryUI(Array(6).fill(null).map(() => ({ date: '', rate: '' })));
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: keyof AgentProfileInput, value: string | number | null) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleRateHistoryChange = (index: number, field: 'date' | 'rate', value: string) => {
    setRateHistoryUI(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.email) return;
    
    setIsSaving(true);
    
    // Convert rate history UI to proper format (filter out empty entries)
    const rateHistory: RateHistoryEntry[] = rateHistoryUI
      .filter(entry => entry.date && entry.rate)
      .map(entry => ({
        date: entry.date,
        rate: parseFloat(entry.rate)
      }));
    
    const result = await upsertProfile({
      ...profile,
      email: user.email.toLowerCase(),
      rate_history: rateHistory
    });
    
    if (result.data) {
      toast({
        title: 'Success',
        description: 'Profile saved successfully'
      });
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{profile.full_name || user?.name || 'Agent'}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={profile.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profile.birthday}
                    onChange={(e) => handleInputChange('birthday', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date (Employment)</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={profile.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="home_address">Home Address</Label>
                <Textarea
                  id="home_address"
                  value={profile.home_address}
                  onChange={(e) => handleInputChange('home_address', e.target.value)}
                  placeholder="Enter your complete home address"
                  rows={2}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Emergency Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={profile.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Name of emergency contact"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={profile.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Work Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position / Role</Label>
                  <Input
                    id="position"
                    value={profile.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="e.g., Customer Service Agent"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team_lead">Team Lead</Label>
                  <Input
                    id="team_lead"
                    value={profile.team_lead}
                    onChange={(e) => handleInputChange('team_lead', e.target.value)}
                    placeholder="Name of your team lead"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clients">Client(s)</Label>
                <Input
                  id="clients"
                  value={profile.clients}
                  onChange={(e) => handleInputChange('clients', e.target.value)}
                  placeholder="e.g., VFS Global, Other Client"
                />
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Compensation</h3>
              
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Current Hourly Rate ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={profile.hourly_rate ?? ''}
                    onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Rate History (Progressions)</Label>
                <div className="space-y-2">
                  {rateHistoryUI.map((entry, index) => (
                    <div key={index} className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleRateHistoryChange(index, 'date', e.target.value)}
                        placeholder="Date"
                      />
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-9"
                          value={entry.rate}
                          onChange={(e) => handleRateHistoryChange(index, 'rate', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Enter dates and rates for up to 6 rate changes</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
