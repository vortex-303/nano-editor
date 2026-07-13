import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoGenerationStats } from '@/services/adminAnalyticsService';
import { Loader2, Video, CheckCircle, XCircle, Clock } from 'lucide-react';

interface VideoStatsCardProps {
  data: VideoGenerationStats | null;
  loading: boolean;
}

export const VideoStatsCard: React.FC<VideoStatsCardProps> = ({ data, loading }) => {
  const getSuccessRate = () => {
    if (!data || data.total === 0) return 0;
    return Math.round((data.completed / data.total) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Generation
        </CardTitle>
        <CardDescription>Video generation job statistics</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[150px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            No video generation data available
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{data.total}</div>
              <div className="text-sm text-muted-foreground">Total Jobs</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
                <div className="text-lg font-bold text-green-600">{data.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-4 w-4 mx-auto text-red-500 mb-1" />
                <div className="text-lg font-bold text-red-600">{data.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                <div className="text-lg font-bold text-yellow-600">{data.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <Badge variant={getSuccessRate() > 80 ? 'default' : 'secondary'}>
                {getSuccessRate()}%
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. Credits Used</span>
              <span className="font-medium">{data.avgCreditsUsed}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
