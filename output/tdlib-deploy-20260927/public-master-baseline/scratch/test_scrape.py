import requests, re
try:
    r = requests.get('https://t.me/s/GanarDineroenLinea', headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
    print(f"Status: {r.status_code}")
    pattern = r'<div class="tgme_widget_message_text[^>]*>(.*?)</div>'
    matches = re.findall(pattern, r.text, re.DOTALL)
    print(f"Matches: {len(matches)}")
except Exception as e:
    print(f"Error: {e}")
