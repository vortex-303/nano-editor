import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserEngagementStats } from '@/services/adminAnalyticsService';
import { Loader2, Users, UserCheck, TrendingUp, Percent } from 'lucide-react';

interface EngagementStatsCardsProps {
  data: UserEngagementStats | null;
  loading: boolean;
}

export const EngagementStatsCards: React.FC<EngagementStatsCardsProps> = ({ data, loading }) => {
  const stats = [
    {
      title: 'Active Today',
      value: data?.activeUsersToday || 0,
      icon: Users,
      description: 'Users who generated today'
    },
    {
      title: 'Active This Week',
      value: data?.activeUsersWeek || 0,
      icon: UserCheck,
      description: 'Users active in last 7 days'
    },
    {
      title: 'Avg. Generations',
      value: data?.averageGenerationsPerUser || 0,
      icon: TrendingUp,
      description: 'Per registered user'
    },
    {
      title: 'Conversion Rate',
      value: `${data?.conversionRate || 0}%`,
      icon: Percent,
      description: 'Anonymous to registered'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
