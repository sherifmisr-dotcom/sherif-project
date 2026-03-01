import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const LG_BREAKPOINT = 1024;

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= LG_BREAKPOINT);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < LG_BREAKPOINT);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  // Track screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < LG_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        // Auto-close sidebar when switching to mobile
        setIsSidebarOpen(false);
      } else {
        // Auto-open sidebar when switching to desktop
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Smart Header Logic
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  // scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsVisible(true);
    setLastScrollY(0);
  }, [location.pathname]);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;

        if (isDashboard) {
          setIsVisible(true);
          return;
        }

        if (currentScrollY === 0) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }

        setLastScrollY(currentScrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);

      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [lastScrollY, isDashboard]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        onToggle={toggleCollapse}
        onClose={closeSidebar}
      />

      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ${isSidebarOpen && !isMobile
            ? isSidebarCollapsed
              ? 'mr-[72px]'
              : 'mr-64'
            : 'mr-0'
          }`}
      >
        <div className={`sticky top-0 z-40 transition-transform duration-300 ${!isDashboard && !isVisible ? '-translate-y-full' : 'translate-y-0'}`}>
          <Header onToggleSidebar={toggleSidebar} />
        </div>

        <main className="flex-1 p-3 md:p-6 min-h-screen">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
