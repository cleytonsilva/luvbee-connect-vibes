import { supabase } from '../integrations/supabase';

export interface CacheMetrics {
  totalCachedPhotos: number;
  cacheHitRate: number;
  averageResponseTime: number;
  storageUsed: number;
  lastCleanup: Date;
}

export interface CacheLogEntry {
  timestamp: Date;
  placeId: string;
  action: 'cache_hit' | 'cache_miss' | 'cache_store' | 'cache_error';
  photoReference?: string;
  responseTime?: number;
  error?: string;
}

export class CacheMonitor {
  private static instance: CacheMonitor;
  private logs: CacheLogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {}

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  /**
   * Log a cache event
   */
  log(entry: Omit<CacheLogEntry, 'timestamp'>) {
    const logEntry: CacheLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`📊 Cache ${entry.action}:`, {
        placeId: entry.placeId,
        photoReference: entry.photoReference,
        responseTime: entry.responseTime,
        error: entry.error
      });
    }
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    try {
      // Get total cached photos
      const { count: totalCachedPhotos } = await supabase
        .from('cached_place_photos')
        .select('*', { count: 'exact', head: true });

      // Get storage usage from bucket
      const { data: files } = await supabase
        .storage
        .from('div')
        .list('', { limit: 1000 });

      const storageUsed = files?.reduce((total, file) => {
        return total + (file.metadata?.size || 0);
      }, 0) || 0;

      // Calculate metrics from logs
      const recentLogs = this.getRecentLogs(100);
      const cacheHits = recentLogs.filter(log => log.action === 'cache_hit').length;
      const cacheMisses = recentLogs.filter(log => log.action === 'cache_miss').length;
      const totalRequests = cacheHits + cacheMisses;
      
      const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      
      const responseTimes = recentLogs
        .filter(log => log.responseTime)
        .map(log => log.responseTime!);
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      return {
        totalCachedPhotos: totalCachedPhotos || 0,
        cacheHitRate,
        averageResponseTime,
        storageUsed,
        lastCleanup: new Date() // TODO: Implement actual cleanup tracking
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return {
        totalCachedPhotos: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        storageUsed: 0,
        lastCleanup: new Date()
      };
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit = 50): CacheLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs for a specific place
   */
  getLogsForPlace(placeId: string, limit = 20): CacheLogEntry[] {
    return this.logs
      .filter(log => log.placeId === placeId)
      .slice(-limit);
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getRecentLogs();
    
    if (format === 'csv') {
      const headers = 'timestamp,placeId,action,photoReference,responseTime,error';
      const rows = logs.map(log => 
        `${log.timestamp.toISOString()},${log.placeId},${log.action},${log.photoReference || ''},${log.responseTime || ''},${log.error || ''}`
      );
      return [headers, ...rows].join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clean up old cache entries
   */
  async cleanup(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // Get old entries
      const { data: oldEntries } = await supabase
        .from('cached_place_photos')
        .select('id, storage_path, created_at')
        .lt('created_at', cutoffDate.toISOString());

      if (!oldEntries || oldEntries.length === 0) {
        console.log('No old cache entries to clean up');
        return 0;
      }

      console.log(`Found ${oldEntries.length} old cache entries to clean up`);

      // Delete from storage first
      const storageDeletePromises = oldEntries.map(entry => 
        supabase.storage.from('div').remove([entry.storage_path])
      );

      const storageResults = await Promise.allSettled(storageDeletePromises);
      const successfulStorageDeletes = storageResults.filter(r => r.status === 'fulfilled').length;

      // Delete from database
      const { error: dbError } = await supabase
        .from('cached_place_photos')
        .delete()
        .in('id', oldEntries.map(e => e.id));

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        return 0;
      }

      console.log(`Cleaned up ${oldEntries.length} cache entries (${successfulStorageDeletes} from storage)`);
      
      this.log({
        placeId: 'system',
        action: 'cache_cleanup',
        responseTime: oldEntries.length
      });

      return oldEntries.length;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: CacheMetrics;
    issues: string[];
  }> {
    const metrics = await this.getMetrics();
    const issues: string[] = [];

    // Check for potential issues
    if (metrics.cacheHitRate < 50) {
      issues.push(`Low cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    }

    if (metrics.averageResponseTime > 2000) {
      issues.push(`High average response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    }

    if (metrics.storageUsed > 100 * 1024 * 1024) { // 100MB
      issues.push(`High storage usage: ${(metrics.storageUsed / 1024 / 1024).toFixed(1)}MB`);
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 2) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      metrics,
      issues
    };
  }
}

// Export singleton instance
export const cacheMonitor = CacheMonitor.getInstance();