'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { checkFCMStatus, logFCMStatus, getFCMToken } from '@/lib/firebase'

export default function DebugFCMPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    const result = await logFCMStatus()
    setStatus(result)
    setLoading(false)
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications not supported')
      return
    }

    const permission = await Notification.requestPermission()
    alert(`Permission: ${permission}`)
    
    if (permission === 'granted') {
      runCheck()
    }
  }

  const testGetToken = async () => {
    setLoading(true)
    const token = await getFCMToken()
    alert(token ? `Token: ${token.substring(0, 50)}...` : 'No token obtained')
    setLoading(false)
    runCheck()
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔔 FCM Debug Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runCheck} disabled={loading}>
                Check FCM Status
              </Button>
              <Button onClick={requestPermission} variant="outline">
                Request Permission
              </Button>
              <Button onClick={testGetToken} variant="secondary">
                Test Get Token
              </Button>
            </div>

            {status && (
              <div className="space-y-4">
                <Card className="bg-muted">
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Browser Support:</span>
                      <span>{status.supported ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Configured:</span>
                      <span>{status.configured ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Permission:</span>
                      <span className={
                        status.permission === 'granted' ? 'text-green-600 font-bold' :
                        status.permission === 'denied' ? 'text-red-600 font-bold' :
                        'text-yellow-600 font-bold'
                      }>
                        {status.permission || 'unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Token:</span>
                      <span>{status.token ? '✅ Obtained' : '❌ No token'}</span>
                    </div>
                  </CardContent>
                </Card>

                {status.token && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm font-mono break-all">
                        <strong>FCM Token:</strong><br />
                        {status.token}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {status.errors.length > 0 && (
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-700 text-base">❌ Issues Found:</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {status.errors.map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {status.configured && status.permission === 'granted' && status.token && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-green-700 font-semibold text-center">
                        ✅ FCM is fully operational!
                      </p>
                    </CardContent>
                  </Card>
                )}

                {status.permission === 'default' && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-6">
                      <p className="text-yellow-700">
                        ⚠️ <strong>Next step:</strong> Click "Request Permission" button to enable notifications
                      </p>
                    </CardContent>
                  </Card>
                )}

                {status.permission === 'denied' && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <p className="text-red-700">
                        🚫 <strong>Notifications blocked.</strong> To enable:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-red-700 mt-2">
                        <li>Click the lock/info icon in the address bar</li>
                        <li>Find "Notifications" and set to "Allow"</li>
                        <li>Reload this page</li>
                      </ol>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-700">
                  <strong>📝 Troubleshooting Steps:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 mt-2">
                  <li>Click "Check FCM Status" to see current state</li>
                  <li>If permission is "default", click "Request Permission"</li>
                  <li>Grant permission when browser prompts</li>
                  <li>Click "Test Get Token" to verify token generation</li>
                  <li>Check browser console (F12) for detailed logs</li>
                </ol>
              </CardContent>
            </Card>

            <div className="pt-4">
              <Button variant="ghost" onClick={() => window.location.href = '/dashboard'}>
                ← Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
