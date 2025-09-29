import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, User, LogOut, LayoutDashboard, BookOpen, Settings } from 'lucide-react';

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
            <span className="text-xl font-bold gradient-text">EduFind</span>
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
                  <Link
                    to="/admin/degrees"
                    className={`flex items-center gap-2 transition-colors ${
                      isActive("/admin/degrees") ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Manage Degrees
                  </Link>
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