/**
 * IdleTimeoutModal Component
 * Displays warning modal before session timeout
 * 
 * Requirements: 3.2, 3.3, 3.4, 15.1, 15.2
 */

import React, { useEffect } from 'react';
import { IdleTimeoutModalProps } from '../../types/idleTimeout.types';
import { Clock, LogOut } from 'lucide-react';
import ModalOverlay from '@/components/ui/ModalOverlay';

export const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onContinue,
  onLogout,
}) => {
  // Escape key handler (Requirement 3.3)
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onContinue]);

  // Conditional rendering based on isOpen (Requirement 15.1, 15.2)
  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-timeout-title"
        aria-describedby="idle-timeout-description"
        dir="rtl"
      >
        {/* Modal content with Arabic text and countdown (Requirements 3.2, 3.3, 3.4) */}
        <div className="px-8 py-8 text-center">
          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-4">
                <Clock className="w-16 h-16 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 id="idle-timeout-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            تحذير انتهاء الجلسة
          </h2>

          {/* Arabic warning text with countdown (Requirement 3.2, 3.5) */}
          <div id="idle-timeout-description">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              ستنتهي الجلسة خلال
            </p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2" aria-live="polite" aria-atomic="true">
              {remainingSeconds}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ثانية. هل تريد الاستمرار؟
            </p>
          </div>

          {/* Action buttons (Requirements 3.3, 3.4) */}
          <div className="flex flex-col gap-3">
            {/* Continue button (استمرار) - Requirement 3.3, auto-focus for accessibility */}
            <button
              onClick={onContinue}
              autoFocus
              className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label="استمرار في الجلسة"
            >
              <span className="font-semibold">استمرار</span>
            </button>

            {/* Logout button (إنهاء الجلسة) - Requirement 3.4 */}
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="إنهاء الجلسة"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">إنهاء الجلسة</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSS animation for modal entrance */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </ModalOverlay>
  );
};
