import urllib.request
import json
import urllib.parse

titles = [
    "File:Mahito (Anime).png",
    "File:Choso (Anime).png",
    "File:Hiromi Higuruma (Manga).png",
    "File:Hiromi Higuruma (Anime).png",
    "File:Suguru Geto (Jujutsu Kaisen 0).png"
]

titles_encoded = urllib.parse.quote("|".join(titles))
url = f"https://jujutsu-kaisen.fandom.com/api.php?action=query&titles={titles_encoded}&prop=imageinfo&iiprop=url&format=json"

headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_info in pages.items():
            title = page_info.get("title")
            imageinfo = page_info.get("imageinfo", [])
            if imageinfo:
                direct_url = imageinfo[0].get("url")
                print(f"TITLE: {title}")
                print(f"URL: {direct_url}")
                print("-" * 40)
            else:
                print(f"TITLE: {title} - NO IMAGE INFO FOUND")
                print("-" * 40)
except Exception as e:
    print(f"ERROR: {str(e)}")
