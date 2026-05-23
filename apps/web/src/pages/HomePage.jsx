import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Bot, Code2, Gamepad2, Newspaper, Radio, Shield, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const { getTranslation } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: getTranslation('feature_fast_title'),
      description: getTranslation('feature_fast_desc')
    },
    {
      icon: Shield,
      title: getTranslation('feature_security_title'),
      description: getTranslation('feature_security_desc')
    },
    {
      icon: Sparkles,
      title: getTranslation('feature_innovation_title'),
      description: getTranslation('feature_innovation_desc')
    }
  ];

  const testimonials = [
    {
      name: 'Elena Rodriguez',
      role: getTranslation('testimonial_role_technical'),
      content: getTranslation('testimonial_content_technical'),
      rating: 4.8
    },
    {
      name: 'Marcus Chen',
      role: getTranslation('testimonial_role_product'),
      content: getTranslation('testimonial_content_product'),
      rating: 4.9
    }
  ];

  const ecosystemSites = [
    {
      icon: Shield,
      title: 'Todo sobre alltech',
      description: getTranslation('ecosystem_main_desc'),
      href: 'https://todosobreall.tech',
    },
    {
      icon: Newspaper,
      title: 'Noticiasweb3',
      description: getTranslation('ecosystem_news_desc'),
      href: 'https://noticiasweb3.todosobreall.tech',
    },
    {
      icon: Radio,
      title: 'Resistencia a la Censura',
      description: getTranslation('ecosystem_resistencia_desc'),
      href: 'https://resistenciaalacensura.todosobreall.tech',
    },
    {
      icon: Bot,
      title: 'Comunidad Telebots',
      description: getTranslation('ecosystem_telebots_desc'),
      href: 'https://comunidadtelebots.todosobreall.tech',
    },
    {
      icon: Gamepad2,
      title: 'TodoSobreGameplays',
      description: getTranslation('ecosystem_gameplays_desc'),
      href: 'https://todosobregameplays.todosobreall.tech',
    },
    {
      icon: Code2,
      title: 'Gamergitbug',
      description: getTranslation('ecosystem_gamergitbug_desc'),
      href: 'https://gamergitbug.todosobreall.tech',
    },
  ];

  return (
    <>
      <Helmet>
        <title>{getTranslation('home_meta_title')}</title>
        <meta name="description" content={getTranslation('home_meta_description')} />
      </Helmet>

      <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1684563983781-ce52a026f139)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95"></div>
        </div>

        <div className="container relative z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {getTranslation('home_hero_title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              {getTranslation('home_hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Button size="lg" asChild className="text-lg px-8">
                    <Link to="/signup">
                      {getTranslation('get_started')}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-lg px-8">
                    <Link to="/login">{getTranslation('login')}</Link>
                  </Button>
                </>
              ) : (
                <Button size="lg" asChild className="text-lg px-8">
                  <Link to="/dashboard">
                    {getTranslation('go_dashboard')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <section className="py-24 bg-muted/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{getTranslation('why_title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getTranslation('why_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-200">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{getTranslation('testimonials_title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getTranslation('testimonials_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-2xl font-bold text-primary">{testimonial.rating}</span>
                        <span className="text-sm text-muted-foreground">/5</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">"{testimonial.content}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{getTranslation('ecosystem_title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getTranslation('ecosystem_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {ecosystemSites.map((site, index) => (
              <motion.div
                key={site.href}
                className="h-full"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                viewport={{ once: true }}
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-200">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <site.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{site.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <CardDescription className="text-base leading-relaxed mb-5">
                      {site.description}
                    </CardDescription>
                    <Button variant="outline" asChild className="mt-auto w-fit">
                      <a href={site.href} target="_blank" rel="noreferrer">
                        {getTranslation('open_site')}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {getTranslation('cta_title')}
            </h2>
            <p className="text-xl mb-8 text-primary-foreground/90">
              {getTranslation('cta_desc')}
            </p>
            {!isAuthenticated ? (
              <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                <Link to="/signup">
                  {getTranslation('get_started_today')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                <Link to="/dashboard">
                  {getTranslation('go_dashboard')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
