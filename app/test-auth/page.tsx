'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthDebugData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/debug', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthData(data);
      } else {
        setError('Failed to fetch auth debug data');
      }
    } catch (error) {
      setError('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthDebugData();
  }, []);

  const handleRefresh = () => {
    fetchAuthDebugData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
          <Button onClick={handleRefresh} variant="outline" className="mt-2">
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-2">Cookie Information</h3>
              <div className="bg-gray-100 p-4 rounded-md mb-4 overflow-x-auto">
                <pre>{JSON.stringify(authData?.cookies, null, 2)}</pre>
              </div>

              <h3 className="text-lg font-semibold mb-2">Token Information</h3>
              <div className="bg-gray-100 p-4 rounded-md mb-4 overflow-x-auto">
                <pre>{JSON.stringify(authData?.token, null, 2)}</pre>
              </div>

              <h3 className="text-lg font-semibold mb-2">Environment Information</h3>
              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre>{JSON.stringify(authData?.env, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 