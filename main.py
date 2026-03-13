"""
JJK Fantasy Draft — static web app.
Open docs/index.html in a browser, or serve the docs/ folder via any static host
(GitHub Pages, Netlify, etc.).

To preview locally:
    python3 -m http.server 8080 --directory docs
Then visit http://localhost:8080
"""
import subprocess
import sys


def main():
    print("JJK Fantasy Draft")
    print("=================")
    print("Serving docs/ at http://localhost:8080 …  (Ctrl+C to stop)\n")
    subprocess.run(
        [sys.executable, "-m", "http.server", "8080", "--directory", "docs"],
    )


if __name__ == "__main__":
    main()
