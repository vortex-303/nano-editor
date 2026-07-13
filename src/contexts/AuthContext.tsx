import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { RoleService } from '@/services/roleService';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  credits: {
    used: number;
    limit: number;
    resetDate: string;
  } | null;
  subscription: {
    tier: string;
    status: string;
    endDate?: string;
  } | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  recoveryTokens: { accessToken: string; refreshToken: string } | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  deductCredit: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState<{ used: number; limit: number; resetDate: string } | null>(null);
  const [subscription, setSubscription] = useState<{ tier: string; status: string; endDate?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [recoveryTokens, setRecoveryTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);

  // Handle email verification and other auth tokens from URL
  const handleAuthTokensFromUrl = async (): Promise<boolean> => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    console.log('Handling auth tokens from URL, type:', type);

    // DRASTIC FIX: For password recovery, DON'T create a session
    // Just store the tokens and flag recovery mode
    if (type === 'recovery' && accessToken && refreshToken) {
      console.log('Password recovery detected - storing tokens WITHOUT creating session');
      setIsPasswordRecovery(true);
      setRecoveryTokens({ accessToken, refreshToken });
      setLoading(false); // Critical: Stop loading so modal can show
      // Clear URL but DON'T call setSession - no auto-login!
      window.history.replaceState(null, '', window.location.pathname);
      return true; // Signal that recovery was detected
    }

    // For other types (signup verification, etc), establish session normally
    if (accessToken && refreshToken) {
      try {
        console.log('Processing auth tokens from URL, type:', type);
        
        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Error setting session from tokens:', error);
          toast({
            title: "Verification Error",
            description: "There was an issue verifying your account. Please try again.",
            variant: "destructive"
          });
        } else if (data.session) {
          console.log('Session established from tokens successfully');
          
          // Show success message based on the type
          if (type === 'signup') {
            toast({
              title: "Email Verified!",
              description: "Your account has been verified successfully. Welcome!",
            });
          } else {
            toast({
              title: "Authentication Successful",
              description: "You have been signed in successfully.",
            });
          }
          
          // Clear URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (error) {
        console.error('Error processing auth tokens:', error);
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your account. Please try again.",
          variant: "destructive"
        });
      }
    }
    
    return false; // No recovery detected
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Handle auth tokens from URL (including recovery tokens)
      const isRecovery = await handleAuthTokensFromUrl();
      
      // If password recovery, skip session check - we don't want to auto-login
      if (isRecovery) {
        console.log('Recovery mode - skipping session check to prevent auto-login');
        return;
      }

      // Set up auth state listener
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state change:', event, !!session?.user);
          
          // PASSWORD_RECOVERY event won't fire anymore since we don't call setSession for recovery
          // Recovery is handled directly in handleAuthTokensFromUrl
          
          setSession(session);
          setUser(session?.user ?? null);
          setIsPasswordRecovery(false);
          
          if (session?.user) {
            console.log('Auth state change: User logged in, fetching credits and subscription');
            fetchUserCreditsForUser(session.user.id);
            fetchUserSubscriptionForUser(session.user.id);
          } else {
            console.log('Auth state change: User logged out, clearing data');
            setCredits(null);
            setSubscription(null);
          }
          setLoading(false);
        }
      );

      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Initial session check:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('Initial session: User found, fetching credits and subscription');
          fetchUserCreditsForUser(session.user.id);
          fetchUserSubscriptionForUser(session.user.id);
        }
        setLoading(false);
      });

      return () => authSubscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const fetchUserCreditsForUser = async (userId: string) => {
    try {
      console.log('fetchUserCreditsForUser: Fetching credits for user:', userId);
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credits:', error);
        return;
      }
      
      if (data) {
        console.log('fetchUserCreditsForUser: Found credits data:', data);
        setCredits({
          used: data.credits_used,
          limit: data.credits_limit,
          resetDate: data.reset_date
        });
      } else {
        console.log('fetchUserCreditsForUser: No credits data found');
        setCredits(null);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchUserCredits = async () => {
    if (!user?.id) {
      console.log('fetchUserCredits: No user ID available');
      return;
    }
    await fetchUserCreditsForUser(user.id);
  };

  const fetchUserSubscriptionForUser = async (userId: string) => {
    try {
      console.log('fetchUserSubscriptionForUser: Fetching subscription for user:', userId);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return;
      }
      
      if (data) {
        console.log('fetchUserSubscriptionForUser: Found subscription data:', data);
        setSubscription({
          tier: data.subscription_tier,
          status: data.subscription_status,
          endDate: data.subscription_end
        });
      } else {
        console.log('fetchUserSubscriptionForUser: No subscription data found');
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchUserSubscription = async () => {
    if (!user?.id) {
      console.log('fetchUserSubscription: No user ID available');
      return;
    }
    await fetchUserSubscriptionForUser(user.id);
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    console.log('Initiating Google OAuth sign-in');
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      console.error('Google OAuth error:', error);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshCredits = async () => {
    if (user?.id) {
      await fetchUserCreditsForUser(user.id);
      await fetchUserSubscriptionForUser(user.id);
    }
  };

  const deductCredit = async (): Promise<boolean> => {
    console.log('deductCredit called', { user: !!user, credits });
    if (!user || !credits) {
      console.log('No user or credits, returning false');
      return false;
    }
    
    // Check if user is admin - admins have unlimited credits
    try {
      const isAdminUser = await RoleService.isAdmin();
      if (isAdminUser) {
        console.log('User is admin, allowing unlimited generation');
        return true;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      // Continue with normal credit check if admin check fails
    }
    
    if (credits.used >= credits.limit) {
      console.log('Credits limit reached', credits);
      return false; // No credits available
    }

    try {
      console.log('Attempting to update credits in database');
      const { error } = await supabase
        .from('user_credits')
        .update({ 
          credits_used: credits.used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deducting credit:', error);
        return false;
      }

      console.log('Credit deducted successfully, updating local state');
      // Update local state
      setCredits(prev => prev ? { ...prev, used: prev.used + 1 } : null);
      return true;
    } catch (error) {
      console.error('Error deducting credit:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user?.email) {
      throw new Error('No user logged in');
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      throw new Error(updateError.message);
    }
  };

  const resetPassword = async (newPassword: string): Promise<void> => {
    console.log('Resetting password...');
    
    // This is called after PASSWORD_RECOVERY event - user has a valid reset token
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(error.message);
    }

    console.log('Password updated successfully, clearing recovery state and signing out');

    // Clear recovery state
    setIsPasswordRecovery(false);
    
    // Sign out to clear the recovery token and provide clean state
    await supabase.auth.signOut();
    
    console.log('Signed out after password reset');
  };

  const requestPasswordReset = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    
    return { error };
  };

  const value = {
    user,
    session,
    credits,
    subscription,
    loading,
    isPasswordRecovery,
    recoveryTokens,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshCredits,
    deductCredit,
    changePassword,
    resetPassword,
    requestPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};