'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SimpleTestPage() {
  const [status, setStatus] = useState<string>('')
  const [token, setToken] = useState<string>('')

  const testFullFlow = async () => {
    setStatus('Testing...\n')
    
    // Step 1: Check notification permission
    setStatus(prev => prev + '1. Checking permission...\n')
    if (!('Notification' in window)) {
      setStatus(prev => prev + '❌ Notifications not supported\n')
      return
    }
    
    let permission = Notification.permission
    setStatus(prev => prev + `   Permission: ${permission}\n`)
    
    if (permission === 'default') {
      setStatus(prev => prev + '   Requesting permission...\n')
      permission = await Notification.requestPermission()
      setStatus(prev => prev + `   New permission: ${permission}\n`)
    }
    
    if (permission !== 'granted') {
      setStatus(prev => prev + '❌ Permission not granted\n')
      return
    }
    
    // Step 2: Get FCM token
    setStatus(prev => prev + '\n2. Getting FCM token...\n')
    try {
      const { getFCMToken } = await import('@/lib/firebase')
      const fcmToken = await getFCMToken()
      
      if (!fcmToken) {
        setStatus(prev => prev + '❌ Failed to get FCM token\n')
        return
      }
      
      setStatus(prev => prev + `✅ Token: ${fcmToken.substring(0, 30)}...\n`)
      setToken(fcmToken)
      
      // Step 3: Register with backend
      setStatus(prev => prev + '\n3. Registering with backend...\n')
      const registerRes = await fetch('/api/notifications/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fcmToken })
      })
      
      if (!registerRes.ok) {
        setStatus(prev => prev + `❌ Registration failed: ${registerRes.status}\n`)
        return
      }
      
      setStatus(prev => prev + '✅ Token registered\n')
      
      // Step 4: Send test notification
      setStatus(prev => prev + '\n4. Sending test notification...\n')
      const sendRes = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification from simple-test page',
          type: 'info',
          is_broadcast: true,
          recipient_ids: []
        })
      })
      
      if (!sendRes.ok) {
        setStatus(prev => prev + `❌ Send failed: ${sendRes.status}\n`)
        const error = await sendRes.text()
        setStatus(prev => prev + `   Error: ${error}\n`)
        return
      }
      
      const result = await sendRes.json()
      setStatus(prev => prev + `✅ Notification sent!\n`)
      setStatus(prev => prev + `   DB Recipients: ${result.recipientCount}\n`)
      setStatus(prev => prev + `   FCM Success: ${result.fcmSuccessCount}\n`)
      setStatus(prev => prev + `   FCM Failed: ${result.fcmFailureCount}\n`)
      
      setStatus(prev => prev + '\n✅ ALL TESTS PASSED!\n')
      setStatus(prev => prev + '\nCheck your device for the notification popup.\n')
      setStatus(prev => prev + 'Also check /dashboard for the notification in the list.\n')
      
    } catch (error: any) {
      setStatus(prev => prev + `❌ Error: ${error.message}\n`)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Simple Notification Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will test the entire notification flow from getting a token to sending a notification.
            </p>
            
            <Button onClick={testFullFlow} className="w-full">
              Run Full Test
            </Button>
            
            {status && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {status}
                  </pre>
                </CardContent>
              </Card>
            )}
            
            {token && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-xs font-mono break-all">
                    <strong>Your FCM Token:</strong><br />
                    {token}
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
