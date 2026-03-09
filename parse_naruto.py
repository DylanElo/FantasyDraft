import json
import re

def parse_data():
    with open('naruto_chars.json', 'r') as f:
        data = json.load(f)

    # Exclude characters from "modulo"
    filtered = []
    for c in data:
        # Check if they are from modulo
        # Usually modulo characters are from "The Modulo" or their names contain modulo
        name = c.get('name', '')
        desc = c.get('description', '')
        if 'modulo' in name.lower() or 'modulo' in desc.lower():
            continue
        filtered.append(c)

    chars_list = []
    for c in filtered:
        name = c.get('name', 'Unknown')
        desc = c.get('description', '')
        skills = c.get('skills', [])

        # Approximate stats based on Naruto Arena values (usually 100 HP, damage is ~20-50 per turn)
        # We will scale them up to look like JJK Card game (HP 2000-10000)
        hp_base = c.get('health', 100) # Assuming some health field might exist or default to 100
        hp = hp_base * 50

        # Approximate attack and defense
        attack = 3000 + len(skills) * 500
        defense = 2500 + len(desc) // 2 * 10

        # Calculate tier based on total stats
        total = hp + attack + defense
        if total >= 16000:
            tier, score = "S+", 12
        elif total >= 14000:
            tier, score = "S", 10
        elif total >= 12000:
            tier, score = "A", 8
        elif total >= 10000:
            tier, score = "B", 6
        elif total >= 8000:
            tier, score = "C", 4
        else:
            tier, score = "D", 2

        # Primary skill name
        skill_name = "Basic Attack"
        if skills and len(skills) > 0:
            skill_name = skills[0].get('name', 'Basic Attack').replace('"', '\\"')

        # Image URL logic (Naruto Arena App stores images as character names without spaces/special chars or specific formats)
        # Using URL encoding for now as Dylan's repo typically maps directly to character names
        # Some are jpg, some are png. The raw repo mostly uses .jpg
        img_name = name.replace(" ", "%20").replace("(", "%28").replace(")", "%29").replace("'", "%27")
        img_url = f"https://raw.githubusercontent.com/DylanElo/naruto-arena-app/master/public/images/characters/{img_name}.jpg"

        safe_name = name.replace('"', '\\"')
        char_str = f'    Character("{safe_name}", "{tier}", {score}, {hp}, {attack}, {defense}, "{skill_name}", "{img_url}"),'
        chars_list.append(char_str)

    with open('characters_list.txt', 'w') as f:
        f.write("\n".join(chars_list))

parse_data()
