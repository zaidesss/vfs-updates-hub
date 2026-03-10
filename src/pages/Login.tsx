import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ToastAction } from '@/components/ui/toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login } = useAuth();
  const { getPendingUpdateCount, ensureLoaded } = useUpdates();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Ensure updates are loaded for pending check after login
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Check for pending updates and show toast if any
      const pendingCount = getPendingUpdateCount(email);
      if (pendingCount > 0) {
        toast({
          title: 'Updates Pending',
          description: `You have ${pendingCount} update(s) to acknowledge.`,
          action: (
            <ToastAction altText="View Updates" onClick={() => navigate('/updates')}>
              <FileText className="h-4 w-4 mr-1" />
              View
            </ToastAction>
          ),
        });
      }
      
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/updates');
      }
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email for the password reset link.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Bell className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Agent Portal</h1>
          <p className="text-muted-foreground mt-2">Manage updates, leave requests, and more</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isForgotPassword ? 'Reset Password' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : 'Enter your credentials to sign in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-scale-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="animate-scale-in border-success/30 bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  autoComplete="email"
                  disabled={!!success}
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isLoading || !!success}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isForgotPassword ? 'Sending...' : 'Signing in...'}
                  </>
                ) : isForgotPassword ? (
                  'Send Reset Link'
                ) : (
                  'Sign In'
                )}
              </Button>

              {isForgotPassword && !success && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                >
                  Back to Sign In
                </Button>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Don't have an account? Contact your administrator to be added to the system.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
