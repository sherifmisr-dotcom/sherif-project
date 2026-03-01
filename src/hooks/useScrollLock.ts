import { useEffect } from 'react';

/**
 * Custom hook to lock/unlock body scroll
 * Useful for modals and overlays to prevent background scrolling
 * 
 * @param isLocked - Boolean to control scroll lock state
 */
export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (isLocked) {
            // Save current scroll position
            const scrollY = window.scrollY;

            // Lock scroll
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            // Get the scroll position before unlocking
            const scrollY = document.body.style.top;

            // Unlock scroll
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';

            // Restore scroll position
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [isLocked]);
}
