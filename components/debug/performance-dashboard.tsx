/**
 * @file components/debug/performance-dashboard.tsx
 * @description Performance debugging dashboard for monitoring authentication and database performance
 * @created 2025-11-15
 */

'use client';

import React, { useState, useEffect } from 'react';
import { authDebug } from '@/lib/services/auth-debug.service';
import { databaseDebug } from '@/lib/services/database-debug.service';
import { debugLogger } from '@/lib/services/debug-logger.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  Download, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  User,
  BarChart3,
  Zap
} from 'lucide-react';

interface DebugStats {
  auth: {
    totalSessions: number;
    successRate: number;
    averageRecoveryTime: number;
    mostSuccessfulStrategy: string;
    strategyPerformance: Record<string, any>;
    browserPerformance: Record<string, any>;
  };
  database: {
    totalSessions: number;
    averageQueryTime: number;
    averageSessionTime: number;
    cacheHitRate: number;
    errorRate: number;
    timeoutRate: number;
    operationPerformance: Record<string, any>;
    queryTypePerformance: Record<string, any>;
  };
}

export function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  // Log environment and debug status for diagnosis
  useEffect(() => {
    const env = process.env.NODE_ENV;
    const debugMode = process.env.DEBUG_MODE;
    const debugInfo = debugLogger.debugInfo();
    
    console.log('🔍 PerformanceDashboard mounted:', {
      environment: env,
      debugMode: debugMode,
      debugServiceEnabled: debugInfo.enabled,
      sessionId: debugInfo.sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Force disable in production if not explicitly enabled
    if (env === 'production' && !debugMode) {
      console.warn('🚨 Production environment detected - debug dashboard should not be visible');
      setIsVisible(false);
      setIsDebugMode(false);
      debugLogger.disable();
    }
  }, []);

  const loadStats = () => {
    const authStats = authDebug.getSummary();
    const dbStats = databaseDebug.getSummary();
    
    setStats({
      auth: authStats,
      database: dbStats
    });
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      debugInfo: debugLogger.debugInfo(),
      authData: authDebug.exportData(),
      databaseData: databaseDebug.exportData(),
      summary: stats
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkvault-debug-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    authDebug.clearData();
    databaseDebug.clearData();
    loadStats();
  };

  const toggleDebugMode = () => {
    const env = process.env.NODE_ENV;
    const debugMode = process.env.DEBUG_MODE;
    
    // Prevent manual enabling in production unless explicitly allowed
    if (env === 'production' && debugMode !== 'true') {
      console.warn('⚠️ Cannot enable debug mode in production environment');
      return;
    }
    
    const newMode = !isDebugMode;
    if (newMode) {
      authDebug.enable();
      databaseDebug.enable();
    } else {
      authDebug.disable();
      databaseDebug.disable();
    }
    setIsDebugMode(newMode);
  };

  useEffect(() => {
    // Check if debug mode is enabled
    const debugInfo = debugLogger.debugInfo();
    setIsDebugMode(debugInfo.enabled);
    loadStats();
  }, []);

  // Prevent dashboard from rendering in production unless explicitly enabled
  const env = process.env.NODE_ENV;
  const debugMode = process.env.DEBUG_MODE;
  
  if (env === 'production' && debugMode !== 'true') {
    console.log('🚫 Debug dashboard disabled in production environment');
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-black text-white border-gray-700 hover:bg-gray-800 hover:border-gray-600"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Debug Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Zap className="h-5 w-5 text-orange-500 mr-2" />
              Performance Dashboard
            </CardTitle>
            <Badge variant={isDebugMode ? "default" : "secondary"}>
              {isDebugMode ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDebugMode}
              title={isDebugMode ? "Disable debug mode" : "Enable debug mode"}
            >
              {isDebugMode ? (
                <Eye className="h-4 w-4 text-green-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              title="Refresh stats"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportData}
              title="Export debug data"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              title="Close dashboard"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {stats && (
            <>
              {/* Authentication Performance */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <h3 className="font-medium">Authentication Performance</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Total Sessions:</span>
                    <span className="font-medium">{stats.auth.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className={`font-medium ${stats.auth.successRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.auth.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Recovery Time:</span>
                    <span className="font-medium">{stats.auth.averageRecoveryTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Strategy:</span>
                    <span className="font-medium">{stats.auth.mostSuccessfulStrategy || 'N/A'}</span>
                  </div>
                </div>

                {Object.keys(stats.auth.strategyPerformance).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-xs font-medium mb-1">Strategy Performance:</h4>
                    {Object.entries(stats.auth.strategyPerformance).map(([strategy, data]) => (
                      <div key={strategy} className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{strategy}:</span>
                        <span className={`font-medium ${data.successes / data.attempts >= 0.8 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.successes / data.attempts * 100).toFixed(1)}% ({data.attempts} attempts)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Database Performance */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <h3 className="font-medium">Database Performance</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Total Sessions:</span>
                    <span className="font-medium">{stats.database.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Query Time:</span>
                    <span className={`font-medium ${stats.database.averageQueryTime <= 2000 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.database.averageQueryTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hit Rate:</span>
                    <span className={`font-medium ${stats.database.cacheHitRate >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.database.cacheHitRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className={`font-medium ${stats.database.errorRate <= 5 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.database.errorRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {Object.keys(stats.database.operationPerformance).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-xs font-medium mb-1">Operation Performance:</h4>
                    {Object.entries(stats.database.operationPerformance).slice(0, 5).map(([operation, data]) => (
                      <div key={operation} className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{operation}:</span>
                        <span className="font-medium">
                          {data.averageTime.toFixed(0)}ms ({data.successRate.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Indicators */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-medium mb-2">Performance Indicators:</h4>
                <div className="space-y-1">
                  {stats.auth.successRate < 80 && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Low authentication success rate</span>
                    </div>
                  )}
                  {stats.database.averageQueryTime > 2000 && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <Clock className="h-3 w-3" />
                      <span>Slow database queries</span>
                    </div>
                  )}
                  {stats.database.cacheHitRate < 70 && (
                    <div className="flex items-center space-x-1 text-xs text-orange-600">
                      <Database className="h-3 w-3" />
                      <span>Low cache hit rate</span>
                    </div>
                  )}
                  {stats.database.errorRate > 5 && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>High database error rate</span>
                    </div>
                  )}
                  {stats.auth.successRate >= 80 && stats.database.averageQueryTime <= 2000 && 
                   stats.database.cacheHitRate >= 70 && stats.database.errorRate <= 5 && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>All performance metrics are healthy</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearData}
                  className="text-xs"
                >
                  Clear Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="text-xs"
                >
                  Export Data
                </Button>
              </div>
            </>
          )}

          {!stats && (
            <div className="text-center py-4 text-sm text-gray-500">
              Loading performance data...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}