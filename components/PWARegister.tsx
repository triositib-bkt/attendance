'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration)
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
          })
      })
    }

    // Handle PWA install prompt
    let deferredPrompt: any

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      
      // Show custom install button or prompt
      console.log('PWA install prompt ready')
      
      // You can trigger the prompt later with:
      // deferredPrompt.prompt()
      // deferredPrompt.userChoice.then((choiceResult) => {
      //   if (choiceResult.outcome === 'accepted') {
      //     console.log('User accepted the install prompt')
      //   }
      //   deferredPrompt = null
      // })
    })

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
    })
  }, [])

  return null
}
