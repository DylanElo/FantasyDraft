const CHARACTERS_DATA = [
  {
    "name": "Satoru Gojo",
    "description": "The strongest jujutsu sorcerer. Limitless technique and Six Eyes grant him unparalleled control over space and cursed energy.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Satoru_Gojo_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Cursed Technique Lapse: Blue",
        "description": "Generates negative space, pulling the enemy in. Deals 20 damage and stuns for 1 turn.",
        "cooldown": "1",
        "energy": [
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Cursed Technique Reversal: Red",
        "description": "Releases a repulsion blast. Deals 35 piercing damage and weakens the enemy by 10 for 1 turn.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Hollow Technique: Purple",
        "description": "Merges Blue and Red into an imaginary mass that erases everything. Deals 55 affliction damage, bypassing all defenses.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "white"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Infinity",
        "description": "Gojo slows all matter approaching him to zero. Becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Yuji Itadori",
    "description": "Vessel of Ryomen Sukuna. Superhuman strength, cursed energy, and the fearless will to protect everyone around him.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/35/Yuji_Itadori_%28Anime_4%29.png",
    "skills": [
      {
        "name": "Divergent Fist",
        "description": "Strikes for 20 damage. The delayed cursed energy blast deals 15 affliction damage next turn.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Black Flash",
        "description": "Spatial distortion at the moment of impact. Deals 45 damage and weakens the enemy by 15 for 1 turn.",
        "cooldown": "2",
        "energy": [
          "green",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Shrine: Dismantle",
        "description": "Sukuna's innate technique leaks through \u2014 an invisible slash dealing 25 affliction damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Unyielding Resolve",
        "description": "Yuji endures all damage through sheer willpower. Gains 25 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Megumi Fushiguro",
    "description": "Ten Shadows Technique. Summons and commands shikigami born from shadows \u2014 each with a unique role.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Megumi_Fushiguro_%28Anime_4%29.png",
    "skills": [
      {
        "name": "Divine Dogs: Totality",
        "description": "Fuses both Divine Dogs into one. Deals 25 damage and weakens the enemy by 10 for 2 turns.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Nue: Thunderstrike",
        "description": "The owl shikigami dives with a thunderclap. Stuns the enemy for 1 turn.",
        "cooldown": "2",
        "energy": [
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Toad: Reverse Summon",
        "description": "A giant toad swallows an ally, shielding them. Target ally becomes invulnerable for 1 turn.",
        "cooldown": "2",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Eight-Handled Sword: Mahoraga",
        "description": "Summons the uncontrollable divine shikigami. Deals 40 piercing damage to all enemies and Megumi becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "blue",
          "green",
          "white"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Nobara Kugisaki",
    "description": "Straw Doll Technique. Nails, a hammer, and cursed energy that attacks the soul directly.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/dd/Nobara_Kugisaki_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Straw Doll: Nail Toss",
        "description": "Fires cursed nails for 15 damage. Enemy takes 10 affliction damage next turn.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Hairpin",
        "description": "Detonates embedded nails with a snap. Deals 30 damage.",
        "cooldown": "1",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Resonance",
        "description": "Channels cursed energy through the doll into the enemy's soul. Deals 25 affliction damage and weakens the target by 15 for 1 turn.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Supernova",
        "description": "Drives a nail through her own face \u2014 channeling raw pain into unstoppable energy. Deals 50 affliction damage. Nobara takes 15 affliction damage.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Kento Nanami",
    "description": "Ratio Technique. Creates a mandatory weak point at the 7:3 spot on any object, guaranteeing devastating strikes.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Kento_Nanami_%28Anime%29.png",
    "skills": [
      {
        "name": "Ratio Technique: 7:3",
        "description": "Marks the mandatory weak point at the 7:3 position. Deals 20 damage and 15 affliction damage per turn for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Collapse",
        "description": "Destroys the environment, sending debris everywhere. Deals 20 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Overtime",
        "description": "Lifts his time restriction. Becomes invulnerable this turn and gains 20 bonus damage for the next skill used.",
        "cooldown": "4",
        "energy": [
          "white",
          "white"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Binding Vow: Work Ethic",
        "description": "Endures through sheer professionalism. Gains 20 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Yuta Okkotsu",
    "description": "Special grade sorcerer. Commands Rika and copies any cursed technique he witnesses. Swordsmanship honed to perfection.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/e6/Yuta_Okkotsu_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Cursed Sword: Rika's Edge",
        "description": "Channels Rika's energy into a sword strike. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Copy: Cursed Technique",
        "description": "Yuta copies the enemy's technique via Rika. Deals 20 piercing damage and weakens by 15 for 2 turns.",
        "cooldown": "1",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Reverse Cursed Technique: Heal",
        "description": "Channels positive energy through Rika to mend an ally's wounds. Heals ally for 35 HP.",
        "cooldown": "2",
        "energy": [
          "white",
          "blue"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "True Form: Rika",
        "description": "Releases Rika's full power. Deals 50 piercing damage to one enemy and Yuta becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "white"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Hakari Kinji",
    "description": "Idle Death Gamble Domain Expansion. A Pachinko machine that, on Jackpot, grants near-infinite cursed energy and immortality.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cf/Kinji_Hakari_%28Anime%29.png",
    "skills": [
      {
        "name": "Restless Love",
        "description": "Reckless brawling strike. Deals 30 damage and heals Hakari for 15.",
        "cooldown": "1",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Pachinko Slam",
        "description": "Throws an enemy into the domain's steel machinery. Deals 20 damage and stuns for 1 turn.",
        "cooldown": "2",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Idle Death Gamble",
        "description": "Domain Expansion. The Pachinko machine runs for 4 turns. Hakari heals 10 HP per turn and gains 10 bonus damage.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "black"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "Jackpot: Infinite Cursed Energy",
        "description": "Jackpot fires \u2014 infinite reverse cursed technique activates. Deals 25 affliction damage and heals Hakari for 20.",
        "cooldown": "2",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Panda",
    "description": "Autonomous cursed corpse with three combat cores: Panda, Gorilla, and Trident. Each grants different capabilities.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2b/Panda_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Drum Beat",
        "description": "Strikes from both arms simultaneously. Deals 20 damage to all enemies.",
        "cooldown": "1",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Gorilla Core: Unblockable",
        "description": "Activates Gorilla core \u2014 an unstoppable straight punch. Deals 30 piercing damage.",
        "cooldown": "2",
        "energy": [
          "red",
          "green"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Gorilla Core: Boost",
        "description": "Gorilla core enhances all strikes. Gains 20 bonus damage and 10 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "red"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "Trident Core: Regeneration",
        "description": "Activates Trident core \u2014 stored cursed energy flows back as healing. Heals 35 HP and becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "white",
          "red"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Shoko Ieiri",
    "description": "The only jujutsu sorcerer capable of healing others with Reverse Cursed Technique. Her surgery keeps allies alive.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/af/Shoko_Ieiri_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Scalpel Strike",
        "description": "A surgical strike to a vital point. Deals 15 piercing damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Emergency Treatment",
        "description": "Rapidly heals an ally's wounds mid-battle. Heals ally for 30 HP.",
        "cooldown": "1",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Reverse Cursed Technique",
        "description": "Full reversal healing \u2014 converts negative energy into positive life force. Heals ally for 40 HP.",
        "cooldown": "2",
        "energy": [
          "white",
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Stabilize",
        "description": "Complete medical intervention: ally becomes invulnerable for 1 turn and gains 15 damage reduction for 2 turns.",
        "cooldown": "4",
        "energy": [
          "white",
          "white"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Masamichi Yaga",
    "description": "Creator of autonomous cursed corpses. Deploys combat dolls with independent souls that fight on their own.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ee/Masamichi_Yaga_%28Anime_3%29.png",
    "skills": [
      {
        "name": "Cursed Corpse: Strike",
        "description": "Deploys a small combat doll to attack. Deals 20 damage and the doll guards him \u2014 gains 10 damage reduction for 2 turns.",
        "cooldown": "1",
        "energy": [
          "blue"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Puppet Swarm",
        "description": "Unleashes multiple dolls to overwhelm one target. Deals 30 damage.",
        "cooldown": "2",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Gummy: Counter Trap",
        "description": "Plants the Gummy doll as a counter trap. Attackers take 20 damage when they strike Yaga.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Autonomous Army",
        "description": "Activates all dolls simultaneously. Deals 35 damage to all enemies.",
        "cooldown": "4",
        "energy": [
          "blue",
          "blue",
          "white"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Takuma Ino",
    "description": "Mythological Beast Worship \u2014 internalizes the powers of legendary beasts: Kaichi, Reiki, Kirin, and Ryu.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9a/Takuma_Ino_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Kaichi: Homing Horn",
        "description": "Manifests Kaichi's homing horn \u2014 a piercing shot that tracks its target. Deals 25 piercing damage.",
        "cooldown": "1",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Reiki: Water Cushion",
        "description": "Manifests Reiki's water shield. Gains 10 damage reduction for 2 turns; attackers take 15 counter-damage.",
        "cooldown": "2",
        "energy": [
          "white",
          "blue"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Kirin: Pain Nullifier",
        "description": "Manifests Kirin's intracerebral doping \u2014 completely nullifies pain this turn. Gains 25 damage reduction for 1 turn.",
        "cooldown": "3",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Ryu: Dragon Crush",
        "description": "Manifests Ryu's full power \u2014 a crushing dragon strike. Deals 45 damage and weakens enemy by 20 for 2 turns.",
        "cooldown": "4",
        "energy": [
          "blue",
          "green",
          "blue"
        ],
        "classes": "Energy,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Arata Nitta",
    "description": "Pain Killer technique \u2014 halts all injury progression on allies. Cannot heal, but prevents wounds from getting worse.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/33/Arata_Nitta_%28Anime%29.png",
    "skills": [
      {
        "name": "Pain Killer",
        "description": "Halts all injury progression on an ally. Ally gains 20 damage reduction for 2 turns.",
        "cooldown": "2",
        "energy": [
          "white"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Emergency Stabilization",
        "description": "Complete injury suppression \u2014 ally becomes invulnerable for 1 turn.",
        "cooldown": "3",
        "energy": [
          "white",
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Wound Suppression",
        "description": "Suppresses bleeding and internal damage. Heals ally for 20 HP.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Precision Strike",
        "description": "Targets a vital point with surgical accuracy. Deals 20 piercing damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Aoi Todo",
    "description": "Grade 1 with overwhelming strength and Boogie Woogie \u2014 claps hands to swap positions, completely disrupting enemies.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/79/Aoi_Todo_%28Anime%29.png",
    "skills": [
      {
        "name": "Boogie Woogie",
        "description": "Claps hands \u2014 swaps the enemy's position mid-action. Stuns the enemy for 1 turn.",
        "cooldown": "1",
        "energy": [
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Crushing Blow",
        "description": "A strike with the weight of 1m+ of muscle behind it. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Disorienting Swap",
        "description": "Swaps and immediately counter-strikes. Deals 20 damage and weakens the enemy by 20 for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Best Friend Combo",
        "description": "Imagines fighting alongside his best friend \u2014 doubles the rhythm. Gains 25 bonus damage for 3 turns.",
        "cooldown": "3",
        "energy": [
          "white",
          "green"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Maki Zenin",
    "description": "Heavenly Restriction strips all cursed energy for a superhuman body. Masters every cursed tool in existence.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2c/Maki_Zen%27in_%28Anime_4%29.png",
    "skills": [
      {
        "name": "Playful Cloud",
        "description": "Three-section staff of the highest grade \u2014 deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Dragon-Bone",
        "description": "Absorbs the enemy's force and adds it to the next strike. Gains 10 damage reduction and 20 bonus damage for 1 turn.",
        "cooldown": "1",
        "energy": [
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Split Soul Katana",
        "description": "A special-grade cursed tool that cuts the soul. Deals 30 piercing damage.",
        "cooldown": "2",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Heavenly Restriction: Peak Form",
        "description": "Activates full Heavenly Restriction \u2014 zero cursed energy, infinite physical potential. Gains 15 damage reduction for 3 turns; physical attackers take 30 counter-damage.",
        "cooldown": "4",
        "energy": [
          "red",
          "green"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Toge Inumaki",
    "description": "Cursed Speech \u2014 his words carry cursed energy, forcing reality to obey. Every command is a technique.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/cb/Toge_Inumaki_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Don't Move",
        "description": "Commands the enemy to halt. Stuns for 1 turn.",
        "cooldown": "1",
        "energy": [
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Blast Away",
        "description": "Commands the enemy to be repelled. Deals 20 damage.",
        "cooldown": "1",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Explode",
        "description": "Commands the enemy's body to detonate from within. Deals 30 affliction damage.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Affliction,Instant"
      },
      {
        "name": "Throat Medicine",
        "description": "Soothes the damage Cursed Speech does to his own throat. Heals 30 HP.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Noritoshi Kamo",
    "description": "Blood Manipulation technique. Controls blood as projectiles, blades, and ensnaring binds.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/d5/Noritoshi_Kamo_(Anime).png",
    "skills": [
      {
        "name": "Convergence",
        "description": "Compresses blood into a dense sphere fired at extreme speed. Deals 30 piercing damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Crimson Binding",
        "description": "Hardens blood into ropes that ensnare the enemy. Stuns for 1 turn and applies 10 affliction damage per turn for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "Flowing Red Scale: Surge",
        "description": "Floods adrenaline into his body through blood manipulation. Deals 20 damage and gains 20 bonus damage for 2 turns.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Eight-Handled Sword: Kumokiri",
        "description": "Summons the divine shikigami of blood. Deals 45 damage and 10 affliction damage per turn for 3 turns.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "blue"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Kasumi Miwa",
    "description": "New Shadow Style iaijutsu. A single Batto Sword Draw can end a fight instantly. Simple Domain counters any Domain Expansion.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/64/Kasumi_Miwa_(Anime).png",
    "skills": [
      {
        "name": "Batto Sword Draw",
        "description": "A single iaijutsu draw \u2014 before the enemy can react. Deals 20 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Three-Flash Consecutive Sword Draw",
        "description": "Three rapid-fire draw-and-sheath strikes in succession. Deals 35 damage.",
        "cooldown": "1",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Simple Domain",
        "description": "Deploys a miniature domain that neutralizes incoming cursed techniques. Stuns the attacker for 1 turn.",
        "cooldown": "2",
        "energy": [
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "New Shadow Style: Zero Draw",
        "description": "A perfect draw that erases all momentum. Deals 40 damage and becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "green",
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Mai Zenin",
    "description": "Construction technique \u2014 creates one object from nothing per day. She uses it to conjure a perfect cursed bullet.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/86/Mai_Zen%27in_(Anime_4).png",
    "skills": [
      {
        "name": "Revolver Shot",
        "description": "Standard cursed energy bullet. Deals 15 damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Construction: Special Bullet",
        "description": "Creates one perfect bullet from nothing. Gains 20 bonus damage for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Rapid Fire",
        "description": "Empties the revolver. Deals 20 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Construction: Armor-Piercing Round",
        "description": "The constructed bullet ignores all defenses \u2014 forged to pierce the soul. Deals 40 affliction damage.",
        "cooldown": "3",
        "energy": [
          "red",
          "green",
          "black"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Utahime Iori",
    "description": "Solo Forbidden Area \u2014 a ritual performance that continuously amplifies all allies' cursed energy output.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b0/Utahime_Iori_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Cursed Strike",
        "description": "A focused cursed energy strike. Deals 15 damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Cursed Energy Boost",
        "description": "Channels amplified energy into one ally. Ally gains 20 bonus damage for 2 turns.",
        "cooldown": "1",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Ritual Incantation",
        "description": "Begins the ritual chant \u2014 all allies gain 10 bonus damage for 2 turns.",
        "cooldown": "2",
        "energy": [
          "white",
          "blue"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Solo Forbidden Area",
        "description": "Full ritual performance \u2014 resonates cursed energy across the entire team. All allies gain 20 bonus damage for 1 turn.",
        "cooldown": "4",
        "energy": [
          "white",
          "white",
          "white"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Yoshinobu Gakuganji",
    "description": "Converts electric guitar sound waves into cursed energy shockwaves. Attacks without direct contact \u2014 the music is the weapon.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/3c/Yoshinobu_Gakuganji_%28Anime%29.png",
    "skills": [
      {
        "name": "Guitar Shockwave",
        "description": "Sound wave strikes one target. Deals 30 damage.",
        "cooldown": "None",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Cursed Resonance",
        "description": "Wide sound wave that engulfs all enemies. Deals 20 damage to all enemies.",
        "cooldown": "1",
        "energy": [
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Feedback Loop",
        "description": "Sound waves build on each other for 3 turns. Deals 15 affliction damage per turn to all enemies.",
        "cooldown": "3",
        "energy": [
          "blue",
          "white"
        ],
        "classes": "Energy,Action"
      },
      {
        "name": "Maximum Feedback",
        "description": "Cranks the amp to maximum \u2014 a devastating sound burst. Deals 45 damage and stuns for 1 turn.",
        "cooldown": "4",
        "energy": [
          "blue",
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Momo Nishimiya",
    "description": "Broomstick flight and Tool Manipulation. Aerial recon and wind blades make her both scout and attacker.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/98/Momo_Nishimiya_%28Anime%29.png",
    "skills": [
      {
        "name": "Broomstick Recon",
        "description": "Surveys the battlefield from above. All allies gain 15 damage reduction for 2 turns.",
        "cooldown": "1",
        "energy": [
          "white"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Wind Sickle",
        "description": "A precise wind blade aimed at one target. Deals 30 damage.",
        "cooldown": "1",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Kamaitachi Barrage",
        "description": "Multiple wind blades fan out across all enemies. Deals 20 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Aerial Evasion",
        "description": "Takes to the air on her broomstick \u2014 completely out of reach. Becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Mei Mei",
    "description": "Grade 1 mercenary. Black Bird Manipulation commands crows \u2014 including using them as suicide bombs for guaranteed kills.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a8/Mei_Mei_(Anime_2).png",
    "skills": [
      {
        "name": "Crow Flock",
        "description": "Sends a flock of crows to harry the enemy. Deals 20 damage and weakens by 10 for 2 turns.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Avid Mercenary",
        "description": "Motivated by money \u2014 fights at peak efficiency. Gains 20 bonus damage for 2 turns.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Dive Bomb",
        "description": "Commands a crow to dive bomb \u2014 high speed, guaranteed to hit. Deals 30 piercing damage.",
        "cooldown": "1",
        "energy": [
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Bird Strike: Suicide Bomb",
        "description": "Sacrifices a crow \u2014 it detonates at point blank range. Cannot be blocked or evaded. Deals 45 affliction damage.",
        "cooldown": "3",
        "energy": [
          "blue",
          "blue",
          "black"
        ],
        "classes": "Affliction,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Naobito Zenin",
    "description": "Projection Sorcery maps 24-frame animations onto surfaces. Anything outside the frames is paralyzed. Fastest special grade after Gojo.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/17/Naobito_Zenin_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Flash Strike",
        "description": "Moves faster than the eye can track. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Projection Sorcery",
        "description": "Maps the enemy into 24 animation frames \u2014 anything outside is paralyzed. Deals 20 damage and stuns for 1 turn.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "1/24 Frames: Maximum Speed",
        "description": "Moves within a single animation frame \u2014 literally faster than thought. Deals 35 piercing damage.",
        "cooldown": "2",
        "energy": [
          "red",
          "green"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Speed of Flash: Full Burst",
        "description": "Unleashes full Projection Sorcery speed \u2014 evades all attacks. Becomes invulnerable for 1 turn and gains 15 bonus damage for 2 turns.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "green"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Toji Fushiguro",
    "description": "Sorcerer Killer. Heavenly Restriction strips all cursed energy for peak human physique. Carries cursed tools and spirits as his arsenal.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/d/db/Toji_Fushiguro_%28Anime%29.png",
    "skills": [
      {
        "name": "Inverted Spear of Heaven",
        "description": "A cursed tool that nullifies all cursed techniques on contact. Deals 25 affliction damage, bypassing all defenses.",
        "cooldown": "1",
        "energy": [
          "black",
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Jinx: Worm Release",
        "description": "Releases the Jinx curse \u2014 a worm that latches onto and weathers the enemy. Deals 15 damage and applies 15 affliction damage per turn for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Affliction,Action"
      },
      {
        "name": "Heavenly Restriction: Peak Body",
        "description": "Activates full Heavenly Restriction \u2014 peak human body with zero cursed energy interference. Gains 20 bonus damage and 15 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "red",
          "green"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "Playful Cloud: Finisher",
        "description": "The highest-grade non-cursed tool \u2014 three devastating strikes. Deals 65 damage.",
        "cooldown": "4",
        "energy": [
          "green",
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Yuki Tsukumo",
    "description": "Special grade sorcerer. Star Rage adds virtual mass to anything she touches \u2014 including herself \u2014 for crushing gravitational attacks.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/22/Yuki_Tsukumo_%28Anime_3%29.png",
    "skills": [
      {
        "name": "Star Rage: Impact",
        "description": "Adds virtual mass to her fist \u2014 crushing blow. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Star Rage: Slam",
        "description": "Concentrates virtual mass into a single point \u2014 a shattering strike. Deals 35 piercing damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Garuda: Continuous Crush",
        "description": "Commands shikigami Garuda to apply Star Rage continuously. All enemies take 10 affliction damage per turn for 3 turns.",
        "cooldown": "3",
        "energy": [
          "white",
          "blue"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Anti-Gravity: Open to All",
        "description": "Releases Star Rage in all directions \u2014 gravitational shockwave. Deals 35 damage to all enemies and stuns for 1 turn.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Kusakabe",
    "description": "Grade 1 New Shadow Style swordsman. Pragmatic, efficient, and hardened. Simple Domain neutralizes any Domain Expansion.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9f/Atsuya_Kusakabe_(Anime_2).png",
    "skills": [
      {
        "name": "Sword Draw",
        "description": "A precise draw-and-strike. Deals 20 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "New Shadow Style: Batto",
        "description": "Lightning-fast draw that leaves no opening. Deals 30 damage.",
        "cooldown": "1",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Simple Domain",
        "description": "Deploys a Simple Domain that neutralizes incoming techniques. Stuns the attacker for 1 turn.",
        "cooldown": "2",
        "energy": [
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Veteran's Resolve",
        "description": "The experience of countless battles \u2014 stance that counters any attack. Gains 20 damage reduction for 2 turns; attackers take 15 counter-damage.",
        "cooldown": "3",
        "energy": [
          "white",
          "green"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Kokichi Muta",
    "description": "Heavenly Restriction stores 17 years of cursed energy in his immobile body. Remotely pilots Mechamaru with overwhelming power.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ea/Kokichi_Muta_%28Anime%29.png",
    "skills": [
      {
        "name": "Ultra Cannon",
        "description": "Concentrated energy blast from the palm. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Ultra Spin",
        "description": "Rapid spinning strikes from the puppet's bladed limbs. Deals 30 damage.",
        "cooldown": "1",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Mode: Albatross",
        "description": "Mouth opens into a wide-bore cannon \u2014 devastating spread shot. Deals 35 damage and weakens by 15 for 1 turn.",
        "cooldown": "2",
        "energy": [
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Mode: Absolute",
        "description": "Converts the entire puppet body into a weapon \u2014 unleashes 17 years of stored cursed energy at once. Deals 55 damage and stuns for 1 turn.",
        "cooldown": "4",
        "energy": [
          "blue",
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Ui Ui",
    "description": "Instantaneous long-range teleportation. Can move anyone anywhere in an instant \u2014 nearly zero offensive power but unmatched ally protection.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/88/Ui_Ui_%28Anime%29.png",
    "skills": [
      {
        "name": "Teleport: Evade",
        "description": "Teleports an ally away from danger in an instant. Ally becomes invulnerable for 1 turn.",
        "cooldown": "1",
        "energy": [
          "blue",
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Teleport: Intercept",
        "description": "Teleports himself in front of an ally, taking the hit. Ally gains 30 damage reduction for 1 turn.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Disorienting Warp",
        "description": "Warps the enemy to a disorienting location. Enemy weakened by 25 for 2 turns and takes 15 affliction damage per turn for 2 turns.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "white"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Desperate Punch",
        "description": "Ui Ui's last resort \u2014 a completely untrained punch. Deals 10 damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Miguel Oduol",
    "description": "African sorcerer with the Black Rope \u2014 a cursed tool so powerful it negates even Gojo's Infinity. Prayer Song technique.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/8e/Miguel_%28Anime%29.png",
    "skills": [
      {
        "name": "Black Rope Lash",
        "description": "Strikes with the cursed Black Rope \u2014 negates cursed energy on contact. Deals 20 piercing damage and weakens by 15 for 2 turns.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Prayer Song: Hakuna Rana",
        "description": "The ritual dance amplifies his strength while diminishing the enemy's. Gains 20 bonus damage and weakens enemy by 15 for 2 turns.",
        "cooldown": "2",
        "energy": [
          "green",
          "blue"
        ],
        "classes": "Physical,Action"
      },
      {
        "name": "Black Rope: Binding",
        "description": "Wraps the enemy in the cursed rope \u2014 all their techniques are suppressed. Deals 25 damage and stuns for 1 turn.",
        "cooldown": "2",
        "energy": [
          "blue",
          "white"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "War Rhythm: Full Power",
        "description": "Full combat tempo reached \u2014 every strike lands at peak power. Deals 45 damage.",
        "cooldown": "4",
        "energy": [
          "green",
          "green",
          "blue"
        ],
        "classes": "Physical,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Master Tengen",
    "description": "Immortal sorcerer over 1000 years old. Maintains Japan's barrier network through the Immortality technique that evolves every 500 years.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/16/Tengen_%28Anime%29.png",
    "skills": [
      {
        "name": "Barrier Pulse",
        "description": "Fires a compressed barrier as a projectile. Deals 20 piercing damage.",
        "cooldown": "None",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Barrier Reinforcement",
        "description": "Strengthens the barrier around all allies. All allies gain 20 damage reduction for 2 turns.",
        "cooldown": "2",
        "energy": [
          "white",
          "white"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Pure Barrier",
        "description": "A perfect, absolute barrier \u2014 nothing can pass through. One ally becomes invulnerable for 1 turn.",
        "cooldown": "3",
        "energy": [
          "white",
          "white",
          "blue"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Immortal Body",
        "description": "Over 1000 years of evolution \u2014 the body simply refuses to die. Heals 30 HP and becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "white",
          "red",
          "white"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Yuta Okkotsu (JJK 0)",
    "description": "Before he mastered her. Rika Okkotsu clings to him as an unstoppable cursed spirit \u2014 raw, unrefined, overwhelming.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/7d/Yuta_Okkotsu_%28JJK0_Anime%29.png",
    "skills": [
      {
        "name": "Basic Slash",
        "description": "Yuta strikes with his sword \u2014 still learning, but determined. Deals 20 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Rika: Lunge",
        "description": "Rika lunges at the enemy with ferocious cursed energy. Deals 35 piercing damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Rika: Scream",
        "description": "Rika's cursed energy erupts \u2014 uncontrollable. Deals 25 affliction damage to the enemy and 10 affliction damage to Yuta.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Rika: True Manifestation",
        "description": "Rika appears in full \u2014 a special grade cursed spirit with no restraint. Deals 60 piercing damage.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "blue"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Rare"
  },
  {
    "name": "Yuta Okkotsu (Sendai)",
    "description": "Sendai Colony Culling Game. Peak Copy technique and Black Flash mastery \u2014 a one-man army operating at special grade ceiling.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/4e/Yuta_Okkotsu_%28Culling_Game%29.png",
    "skills": [
      {
        "name": "Cursed Sword: Full Draw",
        "description": "Full-power draw strike from Yuta's swordsmanship. Deals 25 damage.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Copy: Broadcast",
        "description": "Copies and broadcasts the enemy's technique flaws to all opponents. Deals 20 piercing damage to all enemies and weakens all by 10 for 2 turns.",
        "cooldown": "2",
        "energy": [
          "blue",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Black Flash: Sendai",
        "description": "Black Flash mastery \u2014 spatial distortion at the moment of impact. Deals 40 damage and gains 20 bonus damage for 1 turn.",
        "cooldown": "2",
        "energy": [
          "green",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Rika: Maximum Output",
        "description": "Rika at full power \u2014 a barrage that overwhelms all enemies. Deals 40 piercing damage to all enemies. Yuta becomes invulnerable for 1 turn.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "white"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Yuta (Gojo's Body)",
    "description": "Yuta Okkotsu wearing Satoru Gojo's corpse \u2014 channeling Infinity and Six Eyes through borrowed flesh. A terrifying approximation of the strongest.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b5/Yuta_Gojo_Body.png",
    "skills": [
      {
        "name": "Copied Technique: Slash",
        "description": "A technique copied through Six Eyes \u2014 the optimal strike point revealed. Deals 20 piercing damage.",
        "cooldown": "None",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Cursed Speech: Don't Move",
        "description": "Copied from Inumaki \u2014 commands the enemy to halt. Stuns for 1 turn and deals 15 affliction damage.",
        "cooldown": "2",
        "energy": [
          "blue",
          "white"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Rika: AoE Burst",
        "description": "Rika expands outward from Gojo's body \u2014 cursed energy erupts in all directions. Deals 35 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Infinity: Borrowed",
        "description": "Channels Infinity through Six Eyes and Gojo's corpse. Becomes invulnerable for 1 turn and gains 15 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Gojo (Young)",
    "description": "Before mastery. Near-death against Toji Fushiguro awakened Infinity \u2014 an instinctual survival response. Blue is all he has, but it's enough.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6e/Young_Gojo_%28Anime%29.png",
    "skills": [
      {
        "name": "Cursed Technique Lapse: Blue",
        "description": "Pulls the enemy in with negative space. Deals 20 damage and stuns for 1 turn.",
        "cooldown": "1",
        "energy": [
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Blue: Cascade",
        "description": "A powerful Blue wave sweeps through the enemy line. Deals 25 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Infinity: Awakened Reflex",
        "description": "Infinity activates instinctually \u2014 the near-death survival response. Becomes invulnerable for 1 turn.",
        "cooldown": "3",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Limitless Awakening",
        "description": "Near-death has fully awakened the Limitless \u2014 the true potential begins to surface. Gains 25 bonus damage for 3 turns.",
        "cooldown": "4",
        "energy": [
          "blue",
          "white",
          "black"
        ],
        "classes": "Energy,Action"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Gojo (Unsealed)",
    "description": "Returned from Prison Realm \u2014 furious, fully calibrated, holding nothing back. The same techniques, amplified by righteous rage.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/5/5c/Gojo_Unsealed_%28Anime%29.png",
    "skills": [
      {
        "name": "Blue: Maximum",
        "description": "Blue at full power \u2014 pulls in all enemies simultaneously. Deals 20 damage to all enemies and stuns all for 1 turn.",
        "cooldown": "2",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Cursed Technique Reversal: Red",
        "description": "Releases a repulsion blast. Deals 35 piercing damage and weakens by 10 for 1 turn.",
        "cooldown": "2",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Hollow Technique: Purple",
        "description": "Full-power Purple \u2014 no longer restrained. Deals 55 affliction damage, bypassing all defenses.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "white"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Infinity: Maximum Efficiency",
        "description": "Six Eyes operating at full calibration \u2014 Infinity at absolute peak. Becomes invulnerable for 1 turn.",
        "cooldown": "3",
        "energy": [
          "black"
        ],
        "classes": "Strategic,Instant"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Sukuna (Incarnation)",
    "description": "Ryomen Sukuna possessing Yuji Itadori \u2014 not at full power, but even a fraction is catastrophic. Dismantle and Cleave cut through anything.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/3c/Sukuna_%28Anime_2%29.png",
    "skills": [
      {
        "name": "Innate Technique: Dismantle",
        "description": "An invisible, formless slash cutting through space itself. Deals 25 affliction damage \u2014 cannot be blocked.",
        "cooldown": "None",
        "energy": [
          "red"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Innate Technique: Cleave",
        "description": "Adapts cursed energy to the target's defenses \u2014 cuts exactly as hard as needed. Deals 35 piercing damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Vessel's Strength",
        "description": "Uses Yuji's extraordinary body at full force. Deals 30 damage and weakens by 15 for 2 turns.",
        "cooldown": "2",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Shrine: Limited Domain",
        "description": "Opens a fragment of the Shrine domain \u2014 incomplete but lethal. Deals 40 affliction damage to all enemies.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "black"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Sukuna (Full Power)",
    "description": "Twenty fingers. Megumi Fushiguro's body. Shrine domain, Mahoraga at his command \u2014 Ryomen Sukuna at the apex of his reincarnated power.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/f/fa/Sukuna_Megumi_Body_%28Anime%29.png",
    "skills": [
      {
        "name": "Dismantle: Cascade",
        "description": "Formless slashes fan out across all enemies. Deals 25 affliction damage to all enemies.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Cleave: Maximum",
        "description": "Full-power Cleave adapted for maximum penetration. Deals 45 piercing damage.",
        "cooldown": "2",
        "energy": [
          "red",
          "red"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Summon: Mahoraga",
        "description": "Summons the Eight-Handled Sword Divergent Sila Divine General. Gains 15 damage reduction and a counter-trap for 3 turns \u2014 attackers take 20 damage.",
        "cooldown": "3",
        "energy": [
          "red",
          "blue"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "Malevolent Shrine",
        "description": "Domain Expansion. Shrine fills the entire area with Dismantle and Cleave \u2014 inescapable. Deals 55 affliction damage to all enemies.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "blue"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Sukuna (Heian Era)",
    "description": "The King of Curses in his true body \u2014 four arms, two faces, the most powerful sorcerer in history. Sealed by all of humanity working together.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/9/9a/Sukuna_True_Form_%28Anime%29.png",
    "skills": [
      {
        "name": "Four-Arm Strike",
        "description": "Strikes simultaneously with all four arms. Deals 25 damage to all enemies.",
        "cooldown": "None",
        "energy": [
          "green",
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Dismantle: Ancient Form",
        "description": "The original Dismantle \u2014 refined over centuries. Deals 40 affliction damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "King's Aura",
        "description": "An overwhelming pressure that makes lesser beings freeze. Stuns all enemies for 1 turn and gains 20 damage reduction for 2 turns.",
        "cooldown": "3",
        "energy": [
          "red",
          "white"
        ],
        "classes": "Bloodline,Action"
      },
      {
        "name": "World Slash",
        "description": "A slash so vast it carves the landscape. Deals 45 piercing damage to all enemies.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "red"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Yuji (Black Flash)",
    "description": "Four consecutive Black Flashes in Shibuya \u2014 Yuji's raw cursed energy resonance unlocked at an unprecedented level. The vessel and the curse in harmony.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/ce/Yuji_Shibuya_%28Anime%29.png",
    "skills": [
      {
        "name": "Divergent Fist",
        "description": "Strikes for 20 damage. The delayed cursed energy blast deals 15 affliction damage next turn.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Black Flash: Consecutive",
        "description": "Chains multiple Black Flashes in rapid succession. Deals 40 damage and gains 15 bonus damage for 2 turns.",
        "cooldown": "2",
        "energy": [
          "green",
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Shrine Affinity",
        "description": "Sukuna's technique resonates \u2014 affliction slashes erupt outward. Deals 20 affliction damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Peak Output: Black Flash",
        "description": "Maximum resonance \u2014 the perfect Black Flash at peak cursed energy output. Deals 55 damage and stuns for 1 turn.",
        "cooldown": "4",
        "energy": [
          "green",
          "green",
          "blue"
        ],
        "classes": "Energy,Instant"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Yuji (Awakened)",
    "description": "The Choso bloodline awakens. Yuji Itadori learns he is a Death Painting \u2014 Blood Manipulation surfaces. He fights with his own blood as a weapon.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a3/Yuji_Awakened_%28Anime%29.png",
    "skills": [
      {
        "name": "Divergent Fist",
        "description": "Strikes for 20 damage. The delayed cursed energy blast deals 15 affliction damage next turn.",
        "cooldown": "None",
        "energy": [
          "green"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Piercing Blood",
        "description": "Compresses blood into a needle at extreme speed \u2014 unstoppable penetration. Deals 35 piercing damage.",
        "cooldown": "1",
        "energy": [
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Blood Edge",
        "description": "Forms hardened blood into a blade. Deals 25 damage and applies 10 affliction damage per turn for 2 turns.",
        "cooldown": "2",
        "energy": [
          "red",
          "green"
        ],
        "classes": "Bloodline,Instant"
      },
      {
        "name": "Supernova: Blood Form",
        "description": "Full Blood Manipulation release \u2014 a sphere of compressed blood detonates. Deals 50 affliction damage.",
        "cooldown": "4",
        "energy": [
          "red",
          "red",
          "black"
        ],
        "classes": "Bloodline,Instant"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Kenjaku",
    "description": "An ancient sorcerer who has switched bodies for over a thousand years. Currently in Suguru Geto's body \u2014 Cursed Spirit Manipulation alongside his own unfathomable technique.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/31/Kenjaku_%28Anime%29.png",
    "skills": [
      {
        "name": "Cursed Spirit: Deploy",
        "description": "Deploys a captured cursed spirit to attack. Deals 20 damage and applies 10 affliction damage per turn for 2 turns.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Cursed Spirit: Swarm",
        "description": "Releases multiple captured spirits simultaneously. Deals 30 damage to all enemies.",
        "cooldown": "2",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Prison Realm",
        "description": "Deploys the Prison Realm \u2014 a special grade cursed object that seals everything within. Stuns one enemy for 2 turns.",
        "cooldown": "4",
        "energy": [
          "blue",
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      },
      {
        "name": "Maximum: Uzumaki",
        "description": "Absorbs all captured spirits and fires their combined power in a spiraling vortex. Deals 50 affliction damage to all enemies.",
        "cooldown": "4",
        "energy": [
          "red",
          "blue",
          "blue"
        ],
        "classes": "Bloodline,Action"
      }
    ],
    "rarity": "Legendary"
  },
  {
    "name": "Hiromi Higuruma",
    "description": "A lawyer dragged into the Culling Game. Deadly Sentencing domain renders a verdict \u2014 Guilty means death by the Executioner's Sword.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/e8/Hiromi_Higuruma_%28Anime%29.png",
    "skills": [
      {
        "name": "Judicial Gavel",
        "description": "Strikes with the cursed Gavel \u2014 the implement of judgment. Deals 20 damage.",
        "cooldown": "None",
        "energy": [
          "black"
        ],
        "classes": "Physical,Instant"
      },
      {
        "name": "Confiscation",
        "description": "The court rules: technique confiscated. Weakens the enemy by 25 for 2 turns \u2014 their cursed technique is suppressed.",
        "cooldown": "2",
        "energy": [
          "white",
          "black"
        ],
        "classes": "Strategic,Instant"
      },
      {
        "name": "Executioner's Sword",
        "description": "The sentence is carried out \u2014 a sword that erases the condemned. Deals 60 piercing damage.",
        "cooldown": "3",
        "energy": [
          "blue",
          "blue",
          "black"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Deadly Sentencing",
        "description": "Domain Expansion. The courtroom renders its judgment \u2014 the target is tried and sentenced. Stuns for 1 turn and weakens by 20 for 2 turns.",
        "cooldown": "4",
        "energy": [
          "blue",
          "white",
          "black"
        ],
        "classes": "Strategic,Action"
      }
    ],
    "rarity": "Epic"
  },
  {
    "name": "Uraume",
    "description": "Sukuna's devoted retainer for over a thousand years. Ice Formation technique \u2014 absolute mastery of cold. Fights only for the King of Curses.",
    "image_url": "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ec/Uraume_%28Anime%29.png",
    "skills": [
      {
        "name": "Ice Shard",
        "description": "Fires a sharpened ice shard at the enemy. Deals 20 piercing damage.",
        "cooldown": "None",
        "energy": [
          "blue"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Frost Calm",
        "description": "Encases the enemy in a perfect layer of ice \u2014 complete stillness. Stuns for 1 turn.",
        "cooldown": "2",
        "energy": [
          "blue",
          "white"
        ],
        "classes": "Energy,Instant"
      },
      {
        "name": "Icefall",
        "description": "A cascade of ice continuously forms over the target. Deals 15 affliction damage per turn for 3 turns \u2014 the ice keeps accumulating.",
        "cooldown": "2",
        "energy": [
          "blue",
          "black"
        ],
        "classes": "Energy,Action"
      },
      {
        "name": "Ice Formation: Absolute Zero",
        "description": "Temperature drops to absolute zero. Deals 45 damage to all enemies and stuns all for 1 turn.",
        "cooldown": "4",
        "energy": [
          "blue",
          "blue",
          "white"
        ],
        "classes": "Energy,Action"
      }
    ],
    "rarity": "Epic"
  }
];
