export function trackEvent(name, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

export function trackArticleView(slug, title, category) {
  trackEvent('select_content', {
    content_type: 'article',
    item_id: slug,
    content_category: category || 'Sin categoría',
    content_name: title,
  });
}

export function trackShare(method, slug, title) {
  trackEvent('share', {
    method,
    content_type: 'article',
    item_id: slug,
    content_name: title,
  });
}

export function trackCategoryFilter(category) {
  trackEvent('filter_articles', { category });
}

export function trackSearch(term) {
  trackEvent('search', { search_term: term });
}
