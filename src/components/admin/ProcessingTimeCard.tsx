import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProcessingTimeStats } from '@/services/adminAnalyticsService';
import { Loader2, Timer } from 'lucide-react';

interface ProcessingTimeCardProps {
  data: ProcessingTimeStats | null;
  loading: boolean;
}

export const ProcessingTimeCard: React.FC<ProcessingTimeCardProps> = ({ data, loading }) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Calculate percentage for progress bar (assuming max of 30s)
  const getProgressPercentage = (ms: number) => {
    return Math.min((ms / 30000) * 100, 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Processing Times
        </CardTitle>
        <CardDescription>Image generation performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[150px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            No processing time data available
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average</span>
                <span className="font-medium">{formatTime(data.average)}</span>
              </div>
              <Progress value={getProgressPercentage(data.average)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">P50 (Median)</span>
                <span className="font-medium">{formatTime(data.p50)}</span>
              </div>
              <Progress value={getProgressPercentage(data.p50)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">P95</span>
                <span className="font-medium">{formatTime(data.p95)}</span>
              </div>
              <Progress value={getProgressPercentage(data.p95)} className="h-2" />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Min: {formatTime(data.min)}</span>
              <span>Max: {formatTime(data.max)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
