import urllib.request
import json
import urllib.parse

url = "https://jujutsu-kaisen.fandom.com/api.php?action=query&list=allimages&aiprefix=Suguru_Geto&ailimit=20&format=json"

headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        images = data.get("query", {}).get("allimages", [])
        for img in images:
            print(f"NAME: {img.get('name')}")
            print(f"URL: {img.get('url')}")
            print("-" * 40)
except Exception as e:
    print(f"ERROR: {str(e)}")
