import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusherClient'

export const usePusherChannel = (
  channelName: string,
  eventHandlers: { [event: string]: (data: any) => void }
) => {
  
  useEffect(() => {
    const pusher = getPusherClient()
    let channel: any

    try {
      channel = pusher.subscribe(channelName)
      console.log(`Subscribed to ${channelName}`)
      
      // Add connection status handling
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`Successfully subscribed to ${channelName}`)
      })
      
      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`Error subscribing to ${channelName}:`, error)
      })

      // Store handler references
      const handlers = new Map<string, (data: any) => void>()
      
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        const wrappedHandler = (data: any) => {
          if (channel.subscriptionCount && channel.subscriptionCount > 0) {
            handler(data)
          }
        }
        handlers.set(event, wrappedHandler)
        channel.bind(event, wrappedHandler)
      })

      return () => {
        handlers.forEach((handler, event) => {
          channel.unbind(event, handler)
        })
        pusher.unsubscribe(channelName)
      }
    } catch (error) {
      console.error('Subscription error:', error)
    }
  }, [channelName, eventHandlers])
}