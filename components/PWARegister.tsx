'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function PWARegister() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => {
            console.log('Service Worker registered:', reg)
            setRegistration(reg)

            // Check for updates every 60 seconds
            setInterval(() => {
              reg.update()
            }, 60000)

            // Check for updates when page regains focus
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) {
                reg.update()
              }
            })

            // Listen for waiting service worker
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('New version available!')
                    setShowUpdatePrompt(true)
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
          })

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATED') {
            console.log('Service Worker updated:', event.data.message)
            setShowUpdatePrompt(true)
          }
        })

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('New service worker activated, reloading...')
          window.location.reload()
        })
      })
    }

    // Handle PWA install prompt
    let deferredPrompt: any

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('PWA install prompt ready')
    })

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
    })
  }, [])

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdatePrompt(false)
  }

  return (
    <>
      {showUpdatePrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
          <div className="bg-card border-2 border-primary rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Update Available!</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  A new version is available. Click update to refresh.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} size="sm" className="flex-1">
                    Update Now
                  </Button>
                  <Button onClick={() => setShowUpdatePrompt(false)} variant="outline" size="sm">
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
