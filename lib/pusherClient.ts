import Pusher from 'pusher-js'

let pusherClient: Pusher | null = null

// UPDATE: getPusherClient.ts
export function getPusherClient() {
    if (!pusherClient) {
      // Add debugging options
      Pusher.logToConsole = true
      pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
      })
      
      // Global connection monitoring
      pusherClient.connection.bind('connected', () => {
        console.log('Connected to Pusher')
      })
      
      pusherClient.connection.bind('disconnected', () => {
        console.log('Disconnected from Pusher')
      })
      
      pusherClient.connection.bind('error', (err: Error) => {
        console.error('Pusher connection error:', err)
      })
    }
    return pusherClient
  }