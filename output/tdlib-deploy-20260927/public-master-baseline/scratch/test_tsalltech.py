import requests, re
url = "https://t.me/s/tsalltech"
r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
print(f"Status: {r.status_code}")
pattern = r'<div class="tgme_widget_message_text[^>]*>(.*?)</div>'
matches = re.findall(pattern, r.text, re.DOTALL)
print(f"Matches: {len(matches)}")
if matches:
    print(f"First: {matches[0][:50]}")
else:
    print("No messages found in web preview.")
