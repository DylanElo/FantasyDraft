import urllib.request
import urllib.error

urls = {
    "Mahito": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/4e/Mahito_%28Anime%29.png",
    "Hanami": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/76/Hanami_%28Anime%29.png",
    "Choso": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/20/Choso_%28Anime%29.png",
    "Hiromi": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/62/Hiromi_Higuruma_%28Anime%29.png",
    "Geto_0": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/c2/Suguru_Geto_%28Prequel_Anime%29.png"
}

headers = {'User-Agent': 'Mozilla/5.0'}

for name, url in urls.items():
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"{name}: SUCCESS ({response.status}) - {url}")
    except urllib.error.HTTPError as e:
        print(f"{name}: FAILED ({e.code}) - {url}")
    except Exception as e:
        print(f"{name}: ERROR ({str(e)}) - {url}")
