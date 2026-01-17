// src/main.jsx or src/index.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  persistQueryClient,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import { Toaster } from 'react-hot-toast'
import './index.css'

// ✅ Create a new React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 mins
      cacheTime: 60 * 60 * 1000, // 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// ✅ LocalStorage persister
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
})

// ✅ Persist React Query cache
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 24 * 60 * 60 * 1000, // persist for 24 hours
  buster: 'v1', // bump this if you want to reset cache manually
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success',
  },
})

// ✅ Render root
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)



// import React from 'react'
// import { createRoot } from 'react-dom/client'
// import { BrowserRouter } from 'react-router-dom'
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { AuthProvider } from './context/AuthContext'
// import App from './App'
// import './index.css'
// import { Toaster } from 'react-hot-toast'

// // Create React Query client
// export const queryClient = new QueryClient()

// // Render the app
// createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <QueryClientProvider client={queryClient}>
//       {/* BrowserRouter must wrap everything using React Router hooks */}
//       <BrowserRouter>
//         {/* AuthProvider can now safely use useNavigate */}
//         <AuthProvider>
//           <App />
//           <Toaster position="top-right" />
//         </AuthProvider>
//       </BrowserRouter>
//     </QueryClientProvider>
//   </React.StrictMode>
// )