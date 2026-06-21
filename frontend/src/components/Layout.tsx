import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  User,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Settings,
  FileText,
  ChevronDown,
  Users,
  TrendingUp,
  BarChart3,
  Sliders,
  Building2,
  Zap
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Desktop nav links
  const desktopNav = (
    <nav className="hidden md:flex items-center gap-4">
      {user ? (
        <>
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className={`flex items-center gap-2 transition-colors ${
              isActive(isAdmin ? "/admin" : "/dashboard") ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          {!isAdmin && (
            <>
              <Link
                to="/explore"
                className={`flex items-center gap-2 transition-colors ${
                  isActive("/explore") ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Explore Degrees
              </Link>
              <Link
                to="/profile"
                className={`flex items-center gap-2 transition-colors ${
                  isActive("/profile") ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              {/* Reports Dropdown with hover */}
              {(() => {
                const [openReports, setOpenReports] = useState(false);
                return (
                  <DropdownMenu open={openReports} onOpenChange={setOpenReports}>
                    <div
                      onMouseEnter={() => setOpenReports(true)}
                      onMouseLeave={() => setOpenReports(false)}
                    >
                      <DropdownMenuTrigger
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                          location.pathname.startsWith('/admin/reports')
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        tabIndex={0}
                      >
                        <FileText className="h-4 w-4" />
                        Reports
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports/users" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Users & Demographics
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports/degrees" className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Degrees & Industries
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports/recommendations" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Recommendations & Algorithms
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports/market" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Market Insights
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports/api-performance" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            API Performance
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </div>
                  </DropdownMenu>
                );
              })()}

              {/* Manage Dropdown with hover */}
              {(() => {
                const [openManage, setOpenManage] = useState(false);
                return (
                  <DropdownMenu open={openManage} onOpenChange={setOpenManage}>
                    <div
                      onMouseEnter={() => setOpenManage(true)}
                      onMouseLeave={() => setOpenManage(false)}
                    >
                      <DropdownMenuTrigger
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                          location.pathname.startsWith('/admin/degrees') ||
                          location.pathname.startsWith('/admin/algorithms') ||
                          location.pathname.startsWith('/admin/industries') ||
                          location.pathname.startsWith('/admin/subjects')
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        tabIndex={0}
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/degrees" className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            Degrees
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/algorithms" className="flex items-center gap-2">
                            <Sliders className="h-4 w-4" />
                            Algorithms
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/industries" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Industries
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/subjects" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Subjects
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </div>
                  </DropdownMenu>
                );
              })()}
            </>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <Link to="/explore">
            <Button variant="ghost">Explore</Button>
          </Link>
          <Link to="/auth">
            <Button variant="gradient">Get Started</Button>
          </Link>
          <ThemeToggle />
        </>
      )}
    </nav>
  );

  // Mobile nav links
  const mobileNav = (
    <nav className="flex flex-col gap-4">
      {user ? (
        <>
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className="flex items-center gap-2 py-2"
            onClick={() => setMobileOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          {!isAdmin && (
            <>
              <Link
                to="/explore"
                className="flex items-center gap-2 py-2"
                onClick={() => setMobileOpen(false)}
              >
                <BookOpen className="h-4 w-4" />
                Explore Degrees
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 py-2"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <div className="font-semibold mt-2 mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Reports
              </div>
              <Link to="/admin/reports/users" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <Users className="h-4 w-4" /> Users & Demographics
              </Link>
              <Link to="/admin/reports/degrees" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <GraduationCap className="h-4 w-4" /> Degrees & Industries
              </Link>
              <Link to="/admin/reports/recommendations" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <TrendingUp className="h-4 w-4" /> Recommendations & Algorithms
              </Link>
              <Link to="/admin/reports/market" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <BarChart3 className="h-4 w-4" /> Market Insights
              </Link>
              <Link to="/admin/reports/api-performance" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <Zap className="h-4 w-4" /> API Performance
              </Link>
              <div className="font-semibold mt-4 mb-1 flex items-center gap-2">
                <Settings className="h-4 w-4" /> Manage
              </div>
              <Link to="/admin/degrees" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <GraduationCap className="h-4 w-4" /> Degrees
              </Link>
              <Link to="/admin/algorithms" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <Sliders className="h-4 w-4" /> Algorithms
              </Link>
              <Link to="/admin/industries" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <Building2 className="h-4 w-4" /> Industries
              </Link>
              <Link to="/admin/subjects" className="flex items-center gap-2 py-2" onClick={() => setMobileOpen(false)}>
                <BookOpen className="h-4 w-4" /> Subjects
              </Link>
            </>
          )}
          <div className="flex items-center gap-2 mt-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </>
      ) : (
        <>
          <Link to="/explore" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="w-full">Explore</Button>
          </Link>
          <Link to="/auth" onClick={() => setMobileOpen(false)}>
            <Button variant="gradient" className="w-full">Get Started</Button>
          </Link>
          <div className="mt-4">
            <ThemeToggle />
          </div>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="glass sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold gradient-text">EduAdvisor</span>
          </Link>

          {/* Desktop nav */}
          {desktopNav}

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6">
                {mobileNav}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;