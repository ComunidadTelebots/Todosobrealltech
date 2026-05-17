
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';
import { Button } from '@/components/ui/button';
import { Shield, Menu, X, LogOut, Globe, User, Settings, Cookie } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import pb from '@/lib/pocketbaseClient.js';

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'sv', name: 'Svenska' },
  { code: 'ko', name: '한국어' },
  { code: 'th', name: 'ไทย' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'pl', name: 'Polski' }
];

const Header = () => {
  const { currentUser } = useAuth();
  const { currentLanguage, setLanguage, getTranslation } = useLanguage();
  const { openCookieModal } = useAnalytics();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
  };

  const navLinks = [
    { name: getTranslation('nav_home'), path: '/' },
    { name: getTranslation('nav_blog'), path: '/blog' },
    { name: getTranslation('nav_proxies'), path: '/proxies' },
  ];

  if (currentUser) {
    navLinks.push({ name: getTranslation('nav_dashboard'), path: '/dashboard' });
    if (currentUser.role === 'admin' || currentUser.role === 'creator') {
      navLinks.push({ name: getTranslation('nav_admin'), path: '/admin' });
      navLinks.push({ name: getTranslation('nav_creator'), path: '/creator' });
    }
  }

  const LanguageSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-2 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase">{currentLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="h-[300px] overflow-y-auto">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer ${currentLanguage === lang.code ? 'bg-accent font-medium' : ''}`}
          >
            <span className="w-6 text-xs text-muted-foreground uppercase">{lang.code}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserMenu = () => {
    if (!currentUser) return null;
    
    const avatarUrl = currentUser.avatar ? pb.files.getUrl(currentUser, currentUser.avatar) : '';
    const initials = (currentUser.name || currentUser.email || '?').charAt(0).toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={avatarUrl} alt={currentUser.name || currentUser.email} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.name || getTranslation('user')}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/profile" className="flex items-center w-full">
              <User className="mr-2 h-4 w-4" />
              <span>{getTranslation('profile')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/settings" className="flex items-center w-full">
              <Settings className="mr-2 h-4 w-4" />
              <span>{getTranslation('settings')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openCookieModal} className="cursor-pointer">
            <Cookie className="mr-2 h-4 w-4" />
            <span>{getTranslation('cookie_preferences')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{getTranslation('logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight">Todo sobre alltech</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!currentUser && (
              <Button variant="ghost" size="icon" onClick={openCookieModal} title="Configuración de Cookies" className="text-muted-foreground">
                <Cookie className="w-4 h-4" />
              </Button>
            )}
            <LanguageSelector />
            
            {currentUser ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">{getTranslation('login')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">{getTranslation('signup')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle & Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSelector />
            {currentUser && <UserMenu />}
            <button
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={getTranslation('open_menu')}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container px-4 py-4 space-y-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium ${
                    location.pathname === link.path
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="pt-4 border-t flex flex-col gap-3">
              {!currentUser && (
                <Button variant="ghost" className="w-full justify-start" onClick={() => { openCookieModal(); setIsMobileMenuOpen(false); }}>
                  <Cookie className="w-4 h-4 mr-2" />
                  {getTranslation('cookie_preferences')}
                </Button>
              )}
              {currentUser ? (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      {getTranslation('profile')}
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      {getTranslation('settings')}
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {getTranslation('logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/login">{getTranslation('login')}</Link>
                  </Button>
                  <Button className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                    <Link to="/signup">{getTranslation('signup')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
