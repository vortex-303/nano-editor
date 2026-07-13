import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CreditService } from "@/services/creditService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, AlertCircle, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

interface CreditGuardProps {
  children: ReactNode;
  onUpgrade?: () => void;
}

export const CreditGuard = ({ children, onUpgrade }: CreditGuardProps) => {
  const { user, credits } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  // Check if user can generate (anonymous users cannot generate)
  const canGenerate = () => {
    // Anonymous users cannot generate images
    if (!user) {
      return false;
    }
    
    // Admin users have unlimited credits
    if (isAdmin) {
      return true;
    }
    
    if (credits) {
      return credits.used < credits.limit;
    }
    
    return false;
  };

  const getCreditsInfo = () => {
    if (user && credits) {
      return {
        used: credits.used,
        limit: credits.limit,
        type: 'authenticated'
      };
    } else {
      return {
        used: 0,
        limit: 0,
        type: 'anonymous'
      };
    }
  };

  if (canGenerate()) {
    return <>{children}</>;
  }

  const creditsInfo = getCreditsInfo();

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          {creditsInfo.type === 'anonymous' ? (
            <span>Image generation requires an account. Sign up for free to get 6 generations per month!</span>
          ) : (
            <>
              You've reached your generation limit ({creditsInfo.used}/{creditsInfo.limit}).
              <span> Upgrade to Pro for 100 generations per month!</span>
            </>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex justify-center space-x-3">
        {creditsInfo.type === 'anonymous' ? (
          <Button onClick={() => navigate("/auth")} className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Sign Up for Free</span>
          </Button>
        ) : (
          <Button 
            onClick={() => {
              if (typeof window !== 'undefined' && window.gtag_report_conversion) {
                window.gtag_report_conversion();
              }
              onUpgrade?.();
            }} 
            className="flex items-center space-x-2 bg-gradient-primary"
          >
            <Crown className="h-4 w-4" />
            <span>Upgrade to Pro</span>
          </Button>
        )}
      </div>

      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
};