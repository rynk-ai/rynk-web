"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile keyboard appearance and calculate its height.
 * Uses the Visual Viewport API to determine when the on-screen keyboard is visible.
 * 
 * @returns keyboardHeight - The height of the keyboard in pixels (0 when keyboard is hidden)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const keyboardHeight = useKeyboardAwarePosition();
 *   
 *   return (
 *     <div style={{ transform: `translateY(-${keyboardHeight}px)`, transition: 'transform 0.2s' }}>
 *       <input type="text" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardAwarePosition(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;
    
    // Check if Visual Viewport API is supported
    if (!window.visualViewport) {
      // console.warn('Visual Viewport API not supported in this browser');
      return;
    }

    const handleViewportResize = () => {
      if (window.visualViewport) {
        // Calculate keyboard height by comparing viewport heights
        const visualViewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        
        // The difference represents the keyboard height
        // We use Math.max to ensure we never get negative values
        // We also set a threshold (e.g., 100px) to avoid small layout shifts being interpreted as keyboard
        const diff = windowHeight - visualViewportHeight;
        const calculatedKeyboardHeight = diff > 100 ? diff : 0;
        
        setKeyboardHeight(calculatedKeyboardHeight);
      }
    };

    const handleViewportScroll = () => {
      // Some browsers trigger scroll events when keyboard appears
      // Handle this to ensure smooth transitions
      handleViewportResize();
    };

    // Initial check
    handleViewportResize();

    // Add event listeners
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportScroll);

    // Cleanup
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportScroll);
    };
  }, []);

  return keyboardHeight;
}
