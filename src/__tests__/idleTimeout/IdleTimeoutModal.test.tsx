/**
 * Unit tests for IdleTimeoutModal component
 * Tests Requirements: 3.2, 3.3, 3.4, 15.1, 15.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdleTimeoutModal } from '../../components/idleTimeout/IdleTimeoutModal';

describe('IdleTimeoutModal', () => {
  describe('Rendering', () => {
    it('should not render when isOpen is false (Requirement 15.1)', () => {
      const { container } = render(
        <IdleTimeoutModal
          isOpen={false}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true (Requirement 15.2)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
    });

    it('should display correct Arabic title (Requirement 3.2)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const title = screen.getByText('تحذير انتهاء الجلسة');
      expect(title).toBeTruthy();
    });

    it('should display countdown with remaining seconds (Requirement 3.2)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={45}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      expect(screen.getByText('45')).toBeTruthy();
      expect(screen.getByText('ثانية. هل تريد الاستمرار؟')).toBeTruthy();
    });

    it('should display Continue button with Arabic text (Requirement 3.3)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const continueButton = screen.getByRole('button', { name: /استمرار/i });
      expect(continueButton).toBeTruthy();
    });

    it('should display Logout button with Arabic text (Requirement 3.4)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const logoutButton = screen.getByRole('button', { name: /إنهاء الجلسة/i });
      expect(logoutButton).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes (Requirement 3.3)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('idle-timeout-title');
      expect(dialog.getAttribute('aria-describedby')).toBe('idle-timeout-description');
    });

    it('should auto-focus Continue button (Requirement 3.3)', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const continueButton = screen.getByRole('button', { name: /استمرار/i });
      // Verify the button exists and is the first button (which gets auto-focus)
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBe(continueButton);
    });

    it('should have RTL direction for Arabic text', () => {
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('User Interactions', () => {
    it('should call onContinue when Continue button is clicked (Requirement 3.3)', () => {
      const onContinue = vi.fn();
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={onContinue}
          onLogout={vi.fn()}
        />
      );
      
      const continueButton = screen.getByRole('button', { name: /استمرار/i });
      fireEvent.click(continueButton);
      
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should call onLogout when Logout button is clicked (Requirement 3.4)', () => {
      const onLogout = vi.fn();
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onLogout={onLogout}
        />
      );
      
      const logoutButton = screen.getByRole('button', { name: /إنهاء الجلسة/i });
      fireEvent.click(logoutButton);
      
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should call onContinue when Escape key is pressed (Requirement 3.3)', () => {
      const onContinue = vi.fn();
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={onContinue}
          onLogout={vi.fn()}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should not call onContinue for other keys', () => {
      const onContinue = vi.fn();
      render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={onContinue}
          onLogout={vi.fn()}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      
      expect(onContinue).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener when unmounted', () => {
      const onContinue = vi.fn();
      const { unmount } = render(
        <IdleTimeoutModal
          isOpen={true}
          remainingSeconds={60}
          onContinue={onContinue}
          onLogout={vi.fn()}
        />
      );
      
      unmount();
      
      // After unmount, Escape key should not trigger callback
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onContinue).not.toHaveBeenCalled();
    });

    it('should not add event listener when isOpen is false', () => {
      const onContinue = vi.fn();
      render(
        <IdleTimeoutModal
          isOpen={false}
          remainingSeconds={60}
          onContinue={onContinue}
          onLogout={vi.fn()}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onContinue).not.toHaveBeenCalled();
    });
  });
});
