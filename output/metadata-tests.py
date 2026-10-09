from pathlib import Path
p=Path('.moonbot-reference/tests/test_hub_article_reader.py');s=p.read_text();s=s.replace(' def test_only_post_ids(self):', ''' def test_article_metadata(self):
  import json
  data={'@type':'NewsArticle','datePublished':'2026-09-28T10:20:00Z','author':{'name':'Autora'},'editor':{'name':'Editora'},'publisher':{'name':'Medio'},'articleBody':'Texto completo. '*40}
  result=extract_article('<title>Titular</title><script type="application/ld+json">'+json.dumps(data)+'</script>')
  self.assertEqual(result['author'],'Autora');self.assertEqual(result['editor'],'Editora')
  self.assertEqual(result['publisher_name'],'Medio');self.assertEqual(result['published_at'],'2026-09-28T10:20:00Z')
 def test_only_post_ids(self):''');p.write_text(s)
p=Path('output/deploy-hub-article.py');s=p.read_text();s=s.replace("backup=stage/'article-backup'","backup=stage/'metadata-backup'").replace("files=['core/hub_channel_reader.py'","files=['core/hub_article_reader.py','core/hub_channel_reader.py'").replace("20260928-3','hub-channel-reader.js?v=20260928-4","20260928-5','hub-channel-reader.js?v=20260928-6");Path('output/deploy-hub-metadata.py').write_text(s)
