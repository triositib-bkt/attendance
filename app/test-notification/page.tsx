'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestNotificationPage() {
  const { data: session } = useSession()
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const sendTestNotification = async () => {
    if (!session?.user?.id) {
      setResult('❌ Not logged in')
      return
    }

    setLoading(true)
    setResult('⏳ Sending notification...')

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification sent at ' + new Date().toLocaleTimeString(),
          type: 'info',
          is_broadcast: false,
          recipient_ids: [session.user.id]
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult(`✅ Success!\n\nRecipients: ${data.recipients_count}\nFCM Sent: ${data.fcm_sent}\n\nCheck Vercel logs for details.`)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setResult(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Test Push Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will send a test notification to yourself. Make sure you have:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Granted notification permission</li>
              <li>Registered your FCM token (via /debug-fcm)</li>
              <li>App running in background or closed</li>
            </ul>

            <Button 
              onClick={sendTestNotification} 
              disabled={loading || !session}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Test Notification'}
            </Button>

            {result && (
              <Card className={result.startsWith('✅') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <CardContent className="pt-6">
                  <pre className="text-sm whitespace-pre-wrap">{result}</pre>
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-700">
                  <strong>📝 How to test:</strong>
                </p>
                <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                  <li>Keep this page open</li>
                  <li>Click "Send Test Notification"</li>
                  <li>Check Vercel function logs for send status</li>
                  <li>Minimize browser or switch to another tab</li>
                  <li>You should receive notification within seconds</li>
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
