import html
import re

with open('web/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

def unescape_and_unicode_escape(text):
    # First unescape HTML entities
    unescaped = html.unescape(text)
    # Then convert non-ascii to unicode escape if needed, or just keep as utf-8
    # Browsers handle UTF-8 fine if the file is served as UTF-8.
    return unescaped

clean_content = unescape_and_unicode_escape(content)

with open('web/script.js', 'w', encoding='utf-8') as f:
    f.write(clean_content)
