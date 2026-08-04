import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, EyeOff, FilePenLine, Loader2, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ContentAnalyticsDialog from '@/components/ContentAnalyticsDialog.jsx';
import NewsLayoutBlocksEditor, { parseNewsBlocks } from '@/components/NewsLayoutBlocksEditor.jsx';
import RichNewsTextEditor from '@/components/RichNewsTextEditor.jsx';

const EMPTY_FORM = {
  titulo: '',
  slug: '',
  categoria: '',
  contenido: '',
  fuente_label: '',
  fuente_url: '',
  imagen: '',
  destacado: false,
  oculto: false,
  layout_blocks: [],
};

const CreatorNewsManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [analyticsPost, setAnalyticsPost] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('nw3_noticias').getFullList({
        sort: '-created',
        $autoCancel: false,
      });
      setPosts(records);
    } catch (error) {
      console.error('Failed to load NW3 posts:', error);
      toast.error('No se pudieron cargar las noticias de NW3');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (status === 'visible' && post.oculto) return false;
      if (status === 'hidden' && !post.oculto) return false;
      if (!normalizedQuery) return true;
      return [post.titulo, post.slug, post.categoria]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }, [posts, query, status]);

  const updatePost = async (post, changes, successMessage) => {
    setSavingId(post.id);
    try {
      const updated = await pb.collection('nw3_noticias').update(post.id, changes, { $autoCancel: false });
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(successMessage);
      return updated;
    } catch (error) {
      console.error('Failed to update NW3 post:', error);
      toast.error(error.message || 'No se pudo actualizar la noticia');
      return null;
    } finally {
      setSavingId('');
    }
  };

  const handleToggleVisibility = (post) => updatePost(
    post,
    { oculto: !post.oculto },
    post.oculto ? 'Noticia publicada de nuevo' : 'Noticia ocultada',
  );

  const handleToggleFeatured = (post) => updatePost(
    post,
    { destacado: !post.destacado },
    post.destacado ? 'Noticia retirada de destacados' : 'Noticia destacada',
  );

  const openEditor = (post) => {
    setEditingPost(post);
    setForm({
      titulo: post.titulo || '',
      slug: post.slug || '',
      categoria: post.categoria || '',
      contenido: post.contenido || '',
      fuente_label: post.fuente_label || '',
      fuente_url: post.fuente_url || '',
      imagen: post.imagen || '',
      destacado: !!post.destacado,
      oculto: !!post.oculto,
      layout_blocks: parseNewsBlocks(post.layout_blocks),
    });
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.slug.trim() || !form.contenido.trim()) {
      toast.error('Título, slug y contenido son obligatorios');
      return;
    }

    const updated = await updatePost(editingPost, {
      ...form,
      titulo: form.titulo.trim(),
      slug: form.slug.trim(),
      categoria: form.categoria.trim(),
      contenido: form.contenido.trim(),
      fuente_label: form.fuente_label.trim(),
      fuente_url: form.fuente_url.trim(),
      imagen: form.imagen.trim(),
      layout_blocks: JSON.stringify(form.layout_blocks || []),
    }, 'Noticia actualizada');

    if (updated) setEditingPost(null);
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`¿Eliminar definitivamente "${post.titulo}"? Esta acción no se puede deshacer.`)) return;

    setSavingId(post.id);
    try {
      await pb.collection('nw3_noticias').delete(post.id, { $autoCancel: false });
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success('Noticia eliminada');
    } catch (error) {
      console.error('Failed to delete NW3 post:', error);
      toast.error(error.message || 'No se pudo eliminar la noticia');
    } finally {
      setSavingId('');
    }
  };

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de NoticiasWeb3</h2>
          <p className="text-muted-foreground">
            Revisa, edita, destaca u oculta publicaciones sin salir del panel.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar noticias…"
              className="pl-9 sm:w-64"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Todas</option>
            <option value="visible">Visibles</option>
            <option value="hidden">Ocultas</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">{posts.length} publicaciones</Badge>
        <Badge variant="outline">{posts.filter((post) => !post.oculto).length} visibles</Badge>
        <Badge variant="outline">{posts.filter((post) => post.oculto).length} ocultas</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando publicaciones…
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No hay publicaciones que coincidan con los filtros.
        </div>
      ) : (
        <Accordion type="multiple" className="rounded-xl border bg-background px-4">
          {filteredPosts.map((post) => (
            <AccordionItem key={post.id} value={post.id}>
              <AccordionTrigger className="gap-4 hover:no-underline">
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="line-clamp-1 font-semibold">{post.titulo}</span>
                    {post.oculto && <Badge variant="secondary">Oculta</Badge>}
                    {post.destacado && <Badge className="bg-amber-500 text-white">Destacada</Badge>}
                  </div>
                  <div className="mt-1 text-xs font-normal text-muted-foreground">
                    {post.categoria || 'Sin categoría'} · {new Date(post.created).toLocaleDateString('es-ES')} · {post.visitas || 0} visitas
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-2">
                  <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                    {post.contenido}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAnalyticsPost(post)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Estadísticas
                    </Button>
                    <Button size="sm" onClick={() => openEditor(post)}>
                      <FilePenLine className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleVisibility(post)}
                      disabled={savingId === post.id}
                    >
                      {post.oculto ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                      {post.oculto ? 'Mostrar' : 'Ocultar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleFeatured(post)}
                      disabled={savingId === post.id}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {post.destacado ? 'Quitar destacado' : 'Destacar'}
                    </Button>
                    {!post.oculto && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://noticiasweb3.todosobreall.tech/noticias/${encodeURIComponent(post.slug)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver publicada
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(post)}
                      disabled={savingId === post.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar noticia</DialogTitle>
            <DialogDescription>
              Los cambios se publican en NoticiasWeb3 al guardar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="nw3-title">Título</Label>
              <Input id="nw3-title" value={form.titulo} onChange={(event) => setField('titulo', event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nw3-slug">Slug</Label>
                <Input id="nw3-slug" value={form.slug} onChange={(event) => setField('slug', event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nw3-category">Categoría</Label>
                <Input id="nw3-category" value={form.categoria} onChange={(event) => setField('categoria', event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nw3-content">Contenido</Label>
              <RichNewsTextEditor value={form.contenido} onChange={(value) => setField('contenido', value)} draftKey={editingPost?.id || 'news'} />
            </div>
            <NewsLayoutBlocksEditor value={form.layout_blocks} onChange={(value) => setField('layout_blocks', value)} content={form.contenido}/>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nw3-source-label">Nombre de la fuente</Label>
                <Input id="nw3-source-label" value={form.fuente_label} onChange={(event) => setField('fuente_label', event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nw3-source-url">URL de la fuente</Label>
                <Input id="nw3-source-url" type="url" value={form.fuente_url} onChange={(event) => setField('fuente_url', event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nw3-image">URL de imagen</Label>
              <Input id="nw3-image" type="url" value={form.imagen} onChange={(event) => setField('imagen', event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.destacado} onChange={(event) => setField('destacado', event.target.checked)} />
                Destacada
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.oculto} onChange={(event) => setField('oculto', event.target.checked)} />
                Oculta
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={savingId === editingPost?.id}>
              {savingId === editingPost?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ContentAnalyticsDialog
        open={!!analyticsPost}
        onOpenChange={(open) => !open && setAnalyticsPost(null)}
        kind="news"
        targetId={analyticsPost?.id || ''}
        title={analyticsPost?.titulo || ''}
      />
    </section>
  );
};

export default CreatorNewsManager;
