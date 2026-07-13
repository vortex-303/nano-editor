import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TopUser } from '@/services/adminAnalyticsService';
import { Loader2, Crown, Image, FolderOpen, Workflow } from 'lucide-react';

interface TopUsersTableProps {
  data: TopUser[];
  loading: boolean;
  onUserClick?: (userId: string) => void;
}

export const TopUsersTable: React.FC<TopUsersTableProps> = ({ data, loading, onUserClick }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'pro': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Top Users by Generations
        </CardTitle>
        <CardDescription>Most active users based on image generation count</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No user data available
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {data.map((user, index) => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onUserClick?.(user.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {formatDate(user.last_activity)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.total_generations}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{user.total_projects}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span>{user.total_workflows}</span>
                    </div>
                    <Badge variant={getTierBadgeVariant(user.subscription_tier)}>
                      {user.subscription_tier}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
