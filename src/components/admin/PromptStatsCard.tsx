import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Hash, Fingerprint } from 'lucide-react';

interface PromptStatsCardProps {
  data: { totalPrompts: number; avgLength: number; uniquePrompts: number } | null;
  loading: boolean;
}

export const PromptStatsCard: React.FC<PromptStatsCardProps> = ({ data, loading }) => {
  const stats = [
    {
      label: 'Total Prompts',
      value: data?.totalPrompts || 0,
      icon: MessageSquare
    },
    {
      label: 'Avg. Length',
      value: `${data?.avgLength || 0} chars`,
      icon: Hash
    },
    {
      label: 'Unique Prompts',
      value: data?.uniquePrompts || 0,
      icon: Fingerprint
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Prompt Analytics
        </CardTitle>
        <CardDescription>Statistics about prompts used for generation</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[100px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-3 rounded-lg bg-muted/50">
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
