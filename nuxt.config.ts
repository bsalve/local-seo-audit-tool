export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils', '@pinia/nuxt'],
  runtimeConfig: {
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: ['email', 'profile', 'https://www.googleapis.com/auth/webmasters.readonly'],
        authorizationParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    },
  },
  nitro: {
    compatibilityDate: '2024-11-01',
  },
  vite: {
    server: {
      watch: {
        ignored: ['**/output/**'],
      },
    },
  },
  css: ['~/assets/main.css'],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap',
        },
      ],
    },
  },
})
