import re

def emoji_to_unicode_escape(match):
    char = match.group(0)
    return char.encode('unicode-escape').decode('ascii')

with open('web/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# This is a bit complex, I'll just replace known emojis with their unicode escape
replacements = {
    "🌙": "\\u{1F319}",
    "📊": "\\u{1F4CA}",
    "💬": "\\u{1F4AC}",
    "⚡": "\\u{26A1}",
    "🕸️": "\\u{1F577}\\u{FE0F}",
    "📜": "\\u{1F4DC}",
    "📝": "\\u{1F4DD}",
    "⚙️": "\\u{2699}\\u{FE0F}",
    "🔄": "\\u{1F504}",
    "📖": "\\u{1F4D6}",
    "🏆": "\\u{1F3C6}",
    "🚫": "\\u{1F6AB}",
    "🔍": "\\u{1F50D}",
    "🛡️": "\\u{1F6E1}\\u{FE0F}",
    "🔌": "\\u{1F50C}",
    "📢": "\\u{1F4E2}",
    "💾": "\\u{1F4BE}",
    "⚠️": "\\u{26A0}\\u{FE0F}",
    "📥": "\\u{1F4E5}",
    "🎨": "\\u{1F3A8}",
    "🖼️": "\\u{1F5BC}\\u{FE0F}",
    "📈": "\\u{1F4C8}",
    "🧠": "\\u{1F9E0}",
    "💉": "\\u{1F489}",
    "🔥": "\\u{1F525}",
    "🧹": "\\u{1F9F9}",
    "✅": "\\u{2705}",
    "❌": "\\u{274C}",
    "🌐": "\\u{1F310}",
    "🎭": "\\u{1F3AD}",
    "📡": "\\u{1F4E1}",
    "🔴": "\\u{1F534}",
    "🟢": "\\u{1F60A}" # Wait, positive sentiment was 🟢
}

# Actually, I'll just use a regex to find all non-ascii and convert
def clean_non_ascii(text):
    return re.sub(r'[^\x00-\x7f]', lambda m: f"\\u{{{ord(m.group(0)):X}}}", text)

clean_content = clean_non_ascii(content)

with open('web/script.js', 'w', encoding='utf-8') as f:
    f.write(clean_content)
