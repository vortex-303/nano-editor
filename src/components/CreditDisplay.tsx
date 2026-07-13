import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { CreditService } from "@/services/creditService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, RefreshCw, Infinity } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface CreditDisplayProps {
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export const CreditDisplay = ({ showUpgrade = true, onUpgrade }: CreditDisplayProps) => {
  const { user, credits, subscription, refreshCredits } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  // Anonymous users no longer have credits

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await refreshCredits();
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Determine which credits to show
  const currentCredits = user && credits ? credits : {
    used: 0,
    limit: 0,
    resetDate: new Date().toISOString()
  };

  const isProUser = user && subscription?.tier === 'pro' && subscription?.status === 'active';
  const creditsRemaining = isAdmin ? Number.POSITIVE_INFINITY : currentCredits.limit - currentCredits.used;
  const usagePercentage = isAdmin ? 0 : (currentCredits.used / currentCredits.limit) * 100;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        {isAdmin ? (
          <Infinity className="h-4 w-4 text-purple-500" />
        ) : isProUser ? (
          <Crown className="h-4 w-4 text-yellow-500" />
        ) : (
          <Zap className="h-4 w-4 text-blue-500" />
        )}
        
        <div className="flex items-center space-x-2">
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium leading-none">
              {isAdmin ? '∞' : `${creditsRemaining} / ${currentCredits.limit}`}
            </span>
            <Progress 
              value={usagePercentage} 
              className="w-20 h-1.5 mt-1" 
            />
          </div>
          <Badge variant={isAdmin ? "destructive" : isProUser ? "default" : user ? "secondary" : "outline"} className="text-xs ml-2">
            {isAdmin ? "Admin" : isProUser ? "Pro" : user ? "Free" : "Guest"}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {showUpgrade && !isAdmin && !isProUser && typeof creditsRemaining === 'number' && creditsRemaining <= 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (user) {
              if (typeof window !== 'undefined' && window.gtag_report_conversion) {
                window.gtag_report_conversion();
              }
              onUpgrade?.();
            } else {
              navigate("/auth");
            }
          }}
          className="text-xs"
        >
          {user ? "Upgrade to Pro" : "Sign Up Free"}
        </Button>
      )}
    </div>
  );
};