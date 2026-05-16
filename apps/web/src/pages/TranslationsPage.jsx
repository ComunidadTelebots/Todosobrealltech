import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ArrowLeft, RefreshCw, Wand2, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TranslationFormModal from '@/components/TranslationFormModal.jsx';

const TARGET_LANGS = ['en', 'pt', 'fr', 'de', 'zh', 'ja', 'ar', 'ru', 'it', 'nl', 'sv', 'ko', 'th', 'tr', 'el', 'pl'];

const TranslationsPage = () => {
  const [translations, setTranslations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  
  const [targetLangAll, setTargetLangAll] = useState('');
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translatingKey, setTranslatingKey] = useState(null);
  
  const { refreshTranslations } = useLanguage();

  const fetchTranslations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await pb.collection('translations').getFullList({
        sort: 'key',
        $autoCancel: false
      });
      setTranslations(records);
    } catch (err) {
      console.error('Error fetching translations:', err);
      setError('Failed to load translations. Please try again.');
      toast.error('Failed to load translations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, []);

  const handleAdd = () => {
    setSelectedTranslation(null);
    setIsModalOpen(true);
  };

  const handleEdit = (translation) => {
    setSelectedTranslation(translation);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, key) => {
    if (window.confirm(`Are you sure you want to delete the translation key "${key}"?`)) {
      try {
        await pb.collection('translations').delete(id, { $autoCancel: false });
        toast.success('Translation deleted successfully');
        fetchTranslations();
        refreshTranslations();
      } catch (err) {
        console.error('Error deleting translation:', err);
        toast.error('Failed to delete translation');
      }
    }
  };

  const handleModalSuccess = () => {
    fetchTranslations();
    refreshTranslations();
  };

  const handleTranslateAll = async () => {
    if (!targetLangAll) {
      toast.error('Please select a target language');
      return;
    }

    setIsTranslatingAll(true);
    setProgress(0);

    // Simulate progress while waiting for the backend
    const progressInterval = setInterval(() => {
      setProgress(p => (p < 90 ? p + 5 : p));
    }, 500);

    try {
      const res = await apiServerClient.fetch('/translate/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage: targetLangAll })
      });
      
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (data.failedKeys && data.failedKeys.length > 0) {
        toast.warning(`Translated ${data.totalTranslated || 0} items. Failed: ${data.failedKeys.length}`);
      } else {
        toast.success(`All translations completed successfully (${data.totalTranslated || 0} items)`);
      }
      
      fetchTranslations();
      refreshTranslations();
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      toast.error('Failed to translate all strings');
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsTranslatingAll(false);
        setProgress(0);
      }, 1000);
    }
  };

  const handleTranslateSingle = async (key, targetLanguage, text) => {
    if (!text) {
      toast.error('Source text (ES) is empty');
      return;
    }
    
    setTranslatingKey(`${key}-${targetLanguage}`);
    try {
      const res = await apiServerClient.fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, text, targetLanguage })
      });
      
      if (!res.ok) throw new Error('Translation failed');
      
      toast.success(`Translated ${key} to ${targetLanguage.toUpperCase()}`);
      fetchTranslations();
      refreshTranslations();
    } catch (err) {
      toast.error(`Failed to translate ${key}`);
      console.error(err);
    } finally {
      setTranslatingKey(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Manage Translations - Admin Dashboard</title>
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-[1600px] space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Button variant="ghost" size="icon" asChild className="-ml-2">
                  <Link to="/admin"><ArrowLeft className="w-4 h-4" /></Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Translations</h1>
              </div>
              <p className="text-muted-foreground">
                Manage multi-language content across the platform.
              </p>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Translation
            </Button>
          </div>

          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-primary" /> 
                Automatic Translation
              </CardTitle>
              <CardDescription>
                Automatically translate all missing strings from Spanish (ES) to a target language.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Select value={targetLangAll} onValueChange={setTargetLangAll} disabled={isTranslatingAll}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_LANGS.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleTranslateAll} disabled={isTranslatingAll || !targetLangAll}>
                  {isTranslatingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                  Translate All
                </Button>
              </div>
              
              {isTranslatingAll && (
                <div className="mt-6 space-y-2 max-w-md">
                  <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>Translating...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-500 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Translation Keys</CardTitle>
              <CardDescription>All registered translation strings and their localized values.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" onClick={fetchTranslations}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto relative">
                  <Table className="w-max min-w-full">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[200px] sticky left-0 bg-muted/50 z-20 shadow-[1px_0_0_0_hsl(var(--border))]">Key</TableHead>
                        <TableHead className="min-w-[200px]">ES (Source)</TableHead>
                        {TARGET_LANGS.map(lang => (
                          <TableHead key={lang} className="min-w-[200px] uppercase">{lang}</TableHead>
                        ))}
                        <TableHead className="text-right sticky right-0 bg-muted/50 z-20 shadow-[-1px_0_0_0_hsl(var(--border))]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="sticky left-0 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))]"><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            {TARGET_LANGS.map(lang => (
                              <TableCell key={lang}><Skeleton className="h-4 w-[150px]" /></TableCell>
                            ))}
                            <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-1px_0_0_0_hsl(var(--border))]"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : translations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={TARGET_LANGS.length + 3} className="text-center py-8 text-muted-foreground">
                            No translations found. Click "Add Translation" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        translations.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-mono text-xs font-medium sticky left-0 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                              {t.key}
                            </TableCell>
                            <TableCell className="text-sm truncate max-w-[200px]" title={t.es}>{t.es || '-'}</TableCell>
                            
                            {TARGET_LANGS.map(lang => (
                              <TableCell key={lang} className="min-w-[200px]">
                                <div className="flex items-center justify-between group">
                                  <span className="text-sm truncate max-w-[150px]" title={t[lang]}>{t[lang] || '-'}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => handleTranslateSingle(t.key, lang, t.es)}
                                    title={`Auto translate to ${lang.toUpperCase()}`}
                                    disabled={translatingKey === `${t.key}-${lang}`}
                                  >
                                    {translatingKey === `${t.key}-${lang}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                    ) : (
                                      <Wand2 className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            ))}

                            <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-1px_0_0_0_hsl(var(--border))]">
                              <div className="flex items-center justify-end space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id, t.key)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <TranslationFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        translation={selectedTranslation}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default TranslationsPage;