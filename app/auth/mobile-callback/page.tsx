'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

/**
 * Mobile OAuth Callback Content Component
 * Handles the actual callback logic
 */
function MobileCallbackContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing sign in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      // Wait for session to load
      if (status === 'loading') return;

      // Check if user is authenticated
      if (status === 'unauthenticated' || !session?.user) {
        setError('Authentication failed. Please try again.');
        return;
      }

      try {
        setMessage('Creating mobile session...');

        // Create mobile session token
        const response = await fetch('/api/auth/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.user.email,
            name: session.user.name,
            image: session.user.image,
            provider: 'google',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create mobile session');
        }

        const data: any = await response.json();
        
        // Get redirect URI from query params or use default
        const redirectUri = searchParams.get('redirect_uri') || 'rynk://auth/callback';
        
        // Redirect back to mobile app with token
        const mobileUrl = new URL(redirectUri);
        mobileUrl.searchParams.set('token', data.token);
        mobileUrl.searchParams.set('success', 'true');
        
        setMessage('Redirecting to app...');
        
        // Small delay for UX
        setTimeout(() => {
          window.location.href = mobileUrl.toString();
        }, 500);

      } catch (err: any) {
        console.error('[Mobile Callback] Error:', err);
        setError(err.message || 'Something went wrong');
      }
    }

    handleCallback();
  }, [session, status, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <div className="mb-4 text-4xl">❌</div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Sign In Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <a 
              href="/login" 
              className="mt-4 inline-block text-primary hover:underline"
            >
              Try again
            </a>
          </>
        ) : (
          <>
            <div className="mb-4 animate-spin text-4xl">⏳</div>
            <h1 className="text-xl font-semibold text-foreground mb-2">{message}</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Loading fallback for Suspense
 */
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 animate-spin text-4xl">⏳</div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Loading...</h1>
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );
}

/**
 * Mobile OAuth Callback Page
 * Wrapped in Suspense for useSearchParams
 */
export default function MobileCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MobileCallbackContent />
    </Suspense>
  );
}
