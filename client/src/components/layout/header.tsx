import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, User, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountChip } from "@/components/AccountChip";
// Use the new Howliday Inn logo from brand assets
const logoImage = "/brand/howliday-logo-light.png";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();

  // Check if we're on a light background page
  const isLightBackgroundPage = location === '/add-dog' || location === '/login' || location === '/boarding' || location === '/daycare' || location === '/trial' || location === '/services' || location === '/about';

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    handleScroll(); // Check initial state
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header 
      className={`header fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled || location === '/login' ? 'header--solid' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 sm:h-24 md:h-28">
          <Link href="/" className="flex items-center group cursor-pointer">
            <img 
              src={logoImage} 
              alt="The Howliday Inn - Dog Daycare & Boarding" 
              className="logo transition-all duration-300 group-hover:scale-110 drop-shadow-lg group-hover:drop-shadow-xl"
            />
          </Link>
          
          <nav className="hidden md:flex items-center space-x-12">
            <Link 
              href="/" 
              className="font-medium transition-all duration-200 relative group"
              style={{
                color: (scrolled || location === '/login') ? 'rgba(255, 255, 255, 0.9)' : location === "/" ? 'var(--hi-gold)' : 'var(--hi-brown)'
              }}
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/services" 
              className="font-medium transition-all duration-200 relative group"
              style={{
                color: (scrolled || location === '/login') ? 'rgba(255, 255, 255, 0.9)' : location === "/" ? 'var(--hi-gold)' : location === "/services" ? 'var(--hi-gold)' : 'var(--hi-brown)'
              }}
            >
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/about" 
              className="font-medium transition-all duration-200 relative group"
              style={{
                color: (scrolled || location === '/login') ? 'rgba(255, 255, 255, 0.9)' : location === "/" ? 'var(--hi-gold)' : location === "/about" ? 'var(--hi-gold)' : 'var(--hi-brown)'
              }}
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <AccountChip 
                      name={user.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Account'}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="flex items-center cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/add-dog" className="flex items-center cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Dog Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={logout}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    className="font-medium transition-all duration-200"
                    style={{
                      color: (scrolled || location === '/login') ? 'rgba(255, 255, 255, 0.9)' : location === "/" ? 'var(--hi-gold)' : 'var(--hi-brown)'
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </nav>
          
          <button 
            className={`md:hidden p-3 rounded-xl transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
              scrolled ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-accent active:bg-accent/80"
            }`} 
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            data-testid="button-mobile-menu-toggle"
          >
            {mobileMenuOpen ? (
              <X className={`h-6 w-6 ${scrolled ? "text-white" : "text-foreground"}`} />
            ) : (
              <Menu className={`h-6 w-6 ${scrolled ? "text-white" : "text-foreground"}`} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/20 animate-fade-in">
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-1">
            <Link 
              href="/" 
              className="block font-medium text-gray-900 hover:text-primary active:text-primary transition-colors duration-200 py-3 px-2 rounded-lg hover:bg-accent/50 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-home"
            >
              Home
            </Link>
            <Link 
              href="/services" 
              className="block font-medium text-gray-900 hover:text-primary active:text-primary transition-colors duration-200 py-3 px-2 rounded-lg hover:bg-accent/50 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-services"
            >
              Services
            </Link>
            <Link 
              href="/about" 
              className="block font-medium text-gray-900 hover:text-primary active:text-primary transition-colors duration-200 py-3 px-2 rounded-lg hover:bg-accent/50 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-about"
            >
              About
            </Link>
            
            {user ? (
              <>
                <div className="pt-3 border-t border-white/10 space-y-1">
                  <div className="flex items-center space-x-3 mb-3 px-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || ''} alt="Profile" />
                      <AvatarFallback className="rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-white font-semibold tracking-wide backdrop-blur-sm bg-white/10 ring-1 ring-white/20 shadow-sm flex items-center justify-center transition hover:shadow-[0_0_10px_rgba(201,169,90,0.4)]">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.email?.split('@')[0] || 'Account'}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <Link 
                    href="/account" 
                    className="flex items-center space-x-2 font-medium text-gray-900 hover:text-primary active:text-primary transition-colors duration-200 py-3 px-2 rounded-lg hover:bg-accent/50 min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-account"
                  >
                    <User className="h-5 w-5" />
                    <span>My Account</span>
                  </Link>
                  <Link 
                    href="/add-dog" 
                    className="flex items-center space-x-2 font-medium text-gray-900 hover:text-primary active:text-primary transition-colors duration-200 py-3 px-2 rounded-lg hover:bg-accent/50 min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-add-dog"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Dog Profile</span>
                  </Link>
                  <Button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full justify-start px-2 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg min-h-[44px]"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full mt-2 min-h-[44px]" data-testid="button-mobile-signin">
                  <User className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
