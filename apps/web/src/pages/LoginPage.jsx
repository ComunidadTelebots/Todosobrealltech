import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, AlertCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithTelegram } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [tgReady, setTgReady] = useState(false);
  const nonceRef = useRef('');

  // Client ID del bot (CintiaBot) registrado en BotFather → Web Login.
  const TELEGRAM_CLIENT_ID = 209219812;

  // Carga la librería nativa de Telegram Login (OpenID) una sola vez.
  useEffect(() => {
    if (window.Telegram && window.Telegram.Login) {
      setTgReady(true);
      return;
    }
    const existing = document.getElementById('telegram-login-native');
    if (existing) {
      existing.addEventListener('load', () => setTgReady(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'telegram-login-native';
    script.src = 'https://oauth.telegram.org/js/telegram-login.js';
    script.async = true;
    script.onload = () => setTgReady(true);
    document.head.appendChild(script);
  }, []);

  const handleTelegramLogin = () => {
    if (!window.Telegram || !window.Telegram.Login) {
      toast.error('Telegram todavía se está cargando, inténtalo de nuevo en un momento.');
      return;
    }
    const nonce = (window.crypto?.randomUUID?.() || String(Math.random())).replace(/-/g, '');
    nonceRef.current = nonce;
    setError('');
    setTelegramLoading(true);
    window.Telegram.Login.auth(
      { client_id: TELEGRAM_CLIENT_ID, scope: ['profile'], nonce },
      async (result) => {
        if (!result || result.error || !result.id_token) {
          setTelegramLoading(false);
          if (result && result.error && result.error !== 'cancelled') {
            setError('No se pudo iniciar sesión con Telegram.');
          }
          return;
        }
        const res = await loginWithTelegram({ id_token: result.id_token, nonce });
        if (res.success) {
          toast.success('Sesión iniciada con Telegram');
          navigate('/dashboard');
        } else {
          const errorMsg = res.error === 'Esta cuenta ha sido congelada. Contacta al administrador.'
            ? 'Tu cuenta ha sido congelada. Por favor contacta al administrador para más información.'
            : res.error || 'No se pudo autenticar con Telegram';
          setError(errorMsg);
          toast.error('El login con Telegram falló');
        }
        setTelegramLoading(false);
      },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      const errorMsg = result.error === 'Esta cuenta ha sido congelada. Contacta al administrador.' 
        ? 'Tu cuenta ha sido congelada. Por favor contacta al administrador para más información.'
        : result.error || 'Invalid email or password';
      setError(errorMsg);
    }
    
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Login - Todo sobre alltech</title>
        <meta name="description" content="Login to your Todo sobre alltech account to access your dashboard and manage your profile." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <LogIn className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-center text-balance">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-foreground transition-all duration-200"
                  disabled={loading || telegramLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-foreground transition-all duration-200"
                  disabled={loading || telegramLoading}
                />
              </div>

              <Button type="submit" className="w-full transition-all duration-200 active:scale-[0.98]" disabled={loading || telegramLoading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#2481cc]/10 text-[#2481cc] border-[#2481cc]/20 hover:bg-[#2481cc]/20 hover:text-[#2481cc] transition-all duration-200 active:scale-[0.98]"
              onClick={handleTelegramLogin}
              disabled={loading || telegramLoading || !tgReady}
            >
              {telegramLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Iniciar sesión con Telegram
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-border/50 mt-2">
            <div className="text-sm text-center text-muted-foreground mt-4">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium transition-colors">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default LoginPage;