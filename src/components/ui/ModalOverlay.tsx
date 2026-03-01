import { useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ModalOverlayProps {
    children: ReactNode;
    /** Additional CSS classes for the backdrop */
    className?: string;
}

/**
 * ModalOverlay - Reusable modal backdrop with standard behavior:
 * 1. Locks background scroll when modal is open
 * 2. Prevents close on outside click (modal only closes via its own close button)
 * 3. Plays a subtle shake animation when clicking outside the modal content
 */
export default function ModalOverlay({ children, className = '' }: ModalOverlayProps) {
    const [shaking, setShaking] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Lock body scroll while modal is mounted
    useScrollLock(true);

    const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only trigger shake if the click is directly on the backdrop (not on modal content)
        if (e.target === e.currentTarget) {
            setShaking(true);
        }
    }, []);

    useEffect(() => {
        if (shaking) {
            const timer = setTimeout(() => setShaking(false), 500);
            return () => clearTimeout(timer);
        }
    }, [shaking]);

    return (
        <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto ${className}`}
            onClick={handleBackdropClick}
        >
            <div
                ref={contentRef}
                className={`contents ${shaking ? 'modal-shake' : ''}`}
            >
                {children}
            </div>
        </div>
    );
}
