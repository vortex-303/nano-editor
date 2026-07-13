import { Sparkles, User, LogIn, UserPlus, LogOut, Crown, Shield, Settings, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { TrialBadge } from "./TrialBadge";
import { UpgradeModal } from "./UpgradeModal";
import { AccountSettingsModal } from "./AccountSettingsModal";
import { ApiKeysModal } from "./ApiKeysModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

interface HeaderProps {}

export const Header = ({}: HeaderProps) => {
  const { user, signOut } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useRole();

  const handleSignOut = async () => {
    console.log('Header: Signing out user');
    await signOut();
    console.log('Header: Sign out completed');
  };
  return (
    <header className="border-b border-border/50 bg-gradient-subtle backdrop-blur-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-transparent rounded-lg">
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                Nano Editor
              </h1>
              <p className="text-xs text-muted-foreground">
                Visual node-based image workflows
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <TrialBadge onUpgrade={() => setUpgradeModalOpen(true)} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setApiKeysOpen(true)}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      AI API Keys
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUpgradeModalOpen(true)}>
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/auth")}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/auth")}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <UpgradeModal 
            open={upgradeModalOpen} 
            onOpenChange={setUpgradeModalOpen}
          />
          <AccountSettingsModal
            open={accountSettingsOpen}
            onOpenChange={setAccountSettingsOpen}
          />
          <ApiKeysModal
            open={apiKeysOpen}
            onOpenChange={setApiKeysOpen}
          />
        </div>
      </div>
    </header>
  );
};