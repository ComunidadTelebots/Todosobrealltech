from pathlib import Path
p=Path('apps/noticiasweb3/src/pages/NoticiaDetailPage.jsx');s=p.read_text(encoding='utf-8');s=s.replace('{ ShareBar, readingTime }','{ ShareBar, readingTime, extractText }');s=s.replace("import RelatedNews", "import ArticleFacts from '../components/ArticleFacts.jsx';\nimport RelatedNews")
s=s.replace("  if (article?.year) return `${article.year}-01-01T00:00:00.000Z`;",'  // Do not invent a publication day or time from a year alone.')
s=s.replace("  if (content == null) return;", "  if (content == null) { document.head.querySelector(`meta[property=\"${key}\"]`)?.remove(); return; }")
s=s.replace("    const desc = typeof article.body?.props?.children === 'string'\n      ? article.body.props.children.slice(0, 155)\n      : article.title;", "    const bodyText = pbRecord?.contenido || extractText(article.body);\n    const desc = bodyText.trim().slice(0, 155) || article.title;")
s=s.replace("    setCanonical(url);", """    setMeta('article:section', article.category || '');
    setCanonical(url);
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.dataset.nw3Article = 'true';
    const author = pbRecord?.autor || article.author;
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'NewsArticle',
      headline: article.title, description: desc, url, mainEntityOfPage: url,
      image: [image], articleSection: article.category || undefined,
      datePublished: publishedTime || undefined,
      author: author ? { '@type': 'Person', name: author } : undefined,
      publisher: { '@type': 'Organization', name: siteName },
      isBasedOn: article.source?.url || undefined,
    });
    document.head.appendChild(schema);""")
s=s.replace('return () => { document.title = prev; };','return () => { document.title = prev; schema.remove(); };')
s=s.replace('{readingTime(article.body)} lectura','{readingTime(pbRecord?.contenido || article.body)} lectura estimada')
s=s.replace('      <div className="article-body">','      <ArticleFacts key={article.slug} article={article} record={pbRecord} text={pbRecord?.contenido || extractText(article.body)} published={toIso(article, pbRecord)} />\n\n      <div className="article-body">')
p.write_text(s,encoding='utf-8')
