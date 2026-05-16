import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Zap, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast Performance',
      description: 'Experience blazing-fast load times and seamless interactions with our optimized technology stack.'
    },
    {
      icon: Shield,
      title: 'Enterprise-Grade Security',
      description: 'Your data is protected with industry-leading security measures and encryption protocols.'
    },
    {
      icon: Sparkles,
      title: 'Innovative Solutions',
      description: 'Stay ahead with cutting-edge features and continuous updates that drive your success.'
    }
  ];

  const testimonials = [
    {
      name: 'Elena Rodriguez',
      role: 'CTO at Meridian Labs',
      content: 'Todo sobre alltech transformed our development workflow. The platform is intuitive and powerful.',
      rating: 4.8
    },
    {
      name: 'Marcus Chen',
      role: 'Product Manager at Coastal Roasters',
      content: 'Outstanding support and reliability. Our team productivity increased by 47% within the first month.',
      rating: 4.9
    }
  ];

  return (
    <>
      <Helmet>
        <title>Todo sobre alltech - Comprehensive Technology Solutions</title>
        <meta name="description" content="Your comprehensive technology solutions partner, delivering innovation and excellence in every project. Get started with Todo sobre alltech today." />
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
              Comprehensive technology solutions for modern businesses
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Transform your digital presence with innovative tools, expert guidance, and enterprise-grade infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Button size="lg" asChild className="text-lg px-8">
                    <Link to="/signup">
                      Get Started
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-lg px-8">
                    <Link to="/login">Login</Link>
                  </Button>
                </>
              ) : (
                <Button size="lg" asChild className="text-lg px-8">
                  <Link to="/dashboard">
                    Go to Dashboard
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose Todo sobre alltech</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We deliver comprehensive solutions that combine innovation, reliability, and exceptional performance.
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What our clients say</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust Todo sobre alltech for their technology needs.
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
              Ready to transform your business?
            </h2>
            <p className="text-xl mb-8 text-primary-foreground/90">
              Join thousands of companies already using Todo sobre alltech to drive innovation and growth.
            </p>
            {!isAuthenticated ? (
              <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                <Link to="/signup">
                  Get Started Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                <Link to="/dashboard">
                  Go to Dashboard
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