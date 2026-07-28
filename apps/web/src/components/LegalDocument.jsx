import React from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LegalDocument({ title, description, icon: Icon, children }) {
  return <>
    <Helmet>
      <title>{title} | TodoSobreAllTech</title>
      <meta name="description" content={description} />
    </Helmet>
    <div className="min-h-screen bg-muted/10 py-12">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
        </Link>
        <article className="overflow-hidden rounded-2xl border border-border/50 bg-card text-card-foreground shadow-sm">
          <header className="flex flex-col items-center gap-6 border-b bg-primary/5 p-8 text-center sm:flex-row sm:p-12 sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-8 w-8" /></div>
            <div><h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="text-muted-foreground">Última actualización: 28 de julio de 2026</p></div>
          </header>
          <div className="space-y-10 p-8 leading-relaxed sm:p-12 [&_a]:text-primary [&_a]:underline [&_h2]:border-b [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            {children}
          </div>
        </article>
      </div>
    </div>
  </>;
}
