import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, DollarSign, ChevronLeft, Search } from 'lucide-react';
import { fetchAllProfiles, upsertProfile, AgentProfile, AgentProfileInput, RateHistoryEntry } from '@/lib/agentProfileApi';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ManageProfilesPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AgentProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editData, setEditData] = useState<AgentProfileInput | null>(null);
  const [rateHistoryUI, setRateHistoryUI] = useState<{ date: string; rate: string }[]>([]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    const result = await fetchAllProfiles();
    if (result.data) {
      setProfiles(result.data);
    }
    setIsLoading(false);
  };

  const handleSelectProfile = (profile: AgentProfile) => {
    setSelectedProfile(profile);
    setEditData({
      email: profile.email,
      full_name: profile.full_name || '',
      phone_number: profile.phone_number || '',
      birthday: profile.birthday || '',
      start_date: profile.start_date || '',
      home_address: profile.home_address || '',
      emergency_contact_name: profile.emergency_contact_name || '',
      emergency_contact_phone: profile.emergency_contact_phone || '',
      position: profile.position || '',
      team_lead: profile.team_lead || '',
      clients: profile.clients || '',
      hourly_rate: profile.hourly_rate,
      rate_history: profile.rate_history || []
    });
    
    const existingHistory = profile.rate_history || [];
    const historyUI = Array(6).fill(null).map((_, i) => ({
      date: existingHistory[i]?.date || '',
      rate: existingHistory[i]?.rate?.toString() || ''
    }));
    setRateHistoryUI(historyUI);
  };

  const handleInputChange = (field: keyof AgentProfileInput, value: string | number | null) => {
    if (!editData) return;
    setEditData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleRateHistoryChange = (index: number, field: 'date' | 'rate', value: string) => {
    setRateHistoryUI(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!editData || !selectedProfile) return;
    
    setIsSaving(true);
    
    const rateHistory: RateHistoryEntry[] = rateHistoryUI
      .filter(entry => entry.date && entry.rate)
      .map(entry => ({
        date: entry.date,
        rate: parseFloat(entry.rate)
      }));
    
    const result = await upsertProfile({
      ...editData,
      rate_history: rateHistory
    });
    
    if (result.data) {
      toast({
        title: 'Success',
        description: `Profile for ${editData.full_name || editData.email} saved successfully`
      });
      // Update local state
      setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? result.data! : p));
      setSelectedProfile(result.data);
    } else if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };

  const filteredProfiles = profiles.filter(p => 
    (p.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-muted-foreground">Access denied. Admin/HR only.</p>
        </div>
      </Layout>
    );
  }

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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Agent Profiles</h1>
          <p className="text-muted-foreground">View and edit agent information and compensation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Agents ({profiles.length})</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-3">
                  {filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedProfile?.id === profile.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium truncate">
                        {profile.full_name || 'Unnamed Agent'}
                      </div>
                      <div className={`text-sm truncate ${
                        selectedProfile?.id === profile.id
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      }`}>
                        {profile.email}
                      </div>
                      {profile.hourly_rate && (
                        <div className={`text-xs mt-1 ${
                          selectedProfile?.id === profile.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          ${profile.hourly_rate}/hr
                        </div>
                      )}
                    </button>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No agents found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Profile Editor */}
          <Card className="lg:col-span-2">
            {selectedProfile && editData ? (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedProfile(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{editData.full_name || 'Agent'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedProfile.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={editData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={editData.phone_number}
                          onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Birthday</Label>
                        <Input
                          type="date"
                          value={editData.birthday}
                          onChange={(e) => handleInputChange('birthday', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={editData.start_date}
                          onChange={(e) => handleInputChange('start_date', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Work Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Position / Role</Label>
                        <Input
                          value={editData.position}
                          onChange={(e) => handleInputChange('position', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Team Lead</Label>
                        <Input
                          value={editData.team_lead}
                          onChange={(e) => handleInputChange('team_lead', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Client(s)</Label>
                      <Input
                        value={editData.clients}
                        onChange={(e) => handleInputChange('clients', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Compensation</h3>
                    
                    <div className="space-y-2">
                      <Label>Current Hourly Rate ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-9"
                          value={editData.hourly_rate ?? ''}
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
                      <p className="text-xs text-muted-foreground">Up to 6 rate progression entries</p>
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                <User className="h-12 w-12 mb-4 opacity-50" />
                <p>Select an agent to view and edit their profile</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
