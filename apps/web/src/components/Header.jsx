
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';
import { Button } from '@/components/ui/button';
import { Shield, Menu, X, LogOut, Globe, User, Settings, Cookie, Mic } from 'lucide-react';
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
import apiServerClient from '@/lib/apiServerClient.js';
import { releaseChannel, releaseLabel } from '@/lib/releaseChannel.js';

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
  const [voiceListening, setVoiceListening] = React.useState(false);
  const [entitledChannel, setEntitledChannel] = React.useState('stable');
  const voiceSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  React.useEffect(() => {
    if (!currentUser || !pb.authStore.token) { setEntitledChannel('stable'); return undefined; }
    const controller = new AbortController();
    apiServerClient.fetch('/moonbot-admin/feature-release-access/me', {
      headers: { Authorization: `Bearer ${pb.authStore.token}` }, signal: controller.signal,
    }).then((response) => response.ok ? apiServerClient.readJson(response) : null)
      .then((payload) => payload?.release_channel && setEntitledChannel(payload.release_channel))
      .catch(() => {});
    return () => controller.abort();
  }, [currentUser]);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
  };

  const navLinks = [
    { name: getTranslation('nav_home'), path: '/' },
    { name: getTranslation('nav_blog'), path: '/blog' },
    { name: getTranslation('nav_proxies'), path: '/proxies' },
    { name: 'Roadmap', path: '/roadmap' },
  ];

  const ecosystemLinks = [
    { name: getTranslation('nav_news'), href: 'https://noticiasweb3.todosobreall.tech' },
    { name: getTranslation('nav_resistencia'), href: 'https://resistenciaalacensura.todosobreall.tech' },
    { name: getTranslation('nav_telebots'), href: 'https://comunidadtelebots.todosobreall.tech' },
    { name: getTranslation('nav_gameplays'), href: 'https://todosobregameplays.todosobreall.tech' },
  ];

  if (currentUser) {
    navLinks.push({ name: getTranslation('nav_dashboard'), path: '/dashboard' });
    if (currentUser.role === 'admin' || currentUser.role === 'creator') {
      navLinks.push({ name: getTranslation('nav_admin'), path: '/admin' });
      navLinks.push({ name: getTranslation('nav_creator'), path: '/creator' });
    }
  }

  const startVoiceNavigation = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || voiceListening) return;
    const recognition = new Recognition();
    recognition.lang = currentLanguage || 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript?.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
      const destinations = [
        { words: ['inicio', 'home'], path: '/' }, { words: ['blog'], path: '/blog' },
        { words: ['proxy', 'proxies'], path: '/proxies' }, { words: ['roadmap', 'hoja de ruta'], path: '/roadmap' },
        { words: ['panel', 'dashboard'], path: '/dashboard' }, { words: ['administracion', 'admin'], path: '/admin' },
        { words: ['creador', 'creator'], path: '/creator' }, { words: ['ajustes', 'settings'], path: '/settings' },
        { words: ['perfil', 'profile'], path: '/profile' },
      ];
      const destination = destinations.find((item) => item.words.some((word) => spoken.includes(word)));
      if (destination) { navigate(destination.path); setIsMobileMenuOpen(false); }
    };
    recognition.start();
  };

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
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${releaseChannel === 'stable' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-amber-500/40 bg-amber-500/10 text-amber-700'}`} title={`Canal ejecutado: ${releaseLabel}. Acceso asignado: ${entitledChannel}.`}>{releaseLabel}</span>
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
            {ecosystemLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {voiceSupported && <Button variant="ghost" size="icon" onClick={startVoiceNavigation} aria-label={voiceListening ? 'Escuchando comando de voz' : 'Navegar por voz'} title="Navegar por voz"><Mic className={`h-4 w-4 ${voiceListening ? 'animate-pulse text-primary' : 'text-muted-foreground'}`}/></Button>}
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
            {voiceSupported && <Button variant="ghost" size="icon" onClick={startVoiceNavigation} aria-label={voiceListening ? 'Escuchando comando de voz' : 'Navegar por voz'}><Mic className={`h-4 w-4 ${voiceListening ? 'animate-pulse text-primary' : ''}`}/></Button>}
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
              {ecosystemLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
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
