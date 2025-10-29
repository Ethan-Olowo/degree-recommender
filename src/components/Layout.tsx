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
  Building2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="glass sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold gradient-text">EduAdvisor</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
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
                    {/* Reports Dropdown */}
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
                                <Link to="/admin/reports/academics" className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Academic & Subjects
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
                            </DropdownMenuContent>
                          </div>
                        </DropdownMenu>
                      );
                    })()}

                    {/* Manage Dropdown */}
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
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};