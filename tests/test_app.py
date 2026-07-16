from pathlib import Path
from web import app as web_app


def test_index_defaults_to_phaser_cursed_clash(monkeypatch):
    monkeypatch.delenv("JJK_BATTLE_SYSTEM", raising=False)
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = true;' in html
    assert 'window.JJK_BOOTSTRAP = {' in html
    assert 'id="classic-v2" class="phaser-shell-screen"' in html
    assert 'id="v2-phaser-shell"' in html
    assert 'id="setup"' not in html
    assert 'id="game-arena"' not in html
    assert 'id="team-selection"' not in html
    assert 'id="battle-arena"' not in html
    assert 'id="results"' not in html
    assert 'id="v2-lobby-view"' not in html
    assert 'id="v2-setup-view"' not in html
    assert 'id="v2-battle-view"' not in html
    assert 'id="v2-result-view"' not in html
    assert 'id="v2-bottom-nav"' not in html
    assert "cdn.tailwindcss.com" not in html
    assert "style.css" not in html
    assert "jjk-theme.css" not in html
    assert "arena-redesign.css" not in html
    assert "jjk-tokens.css" not in html
    assert "stitch-tokens.css" not in html
    assert "stitch-archive.css" not in html


def test_index_exposes_battle_v2_entry_when_enabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert 'const BATTLE_V2_ENABLED = true;' in html
    assert 'id="classic-v2" class="phaser-shell-screen"' in html
    assert 'id="v2-phaser-shell"' in html
    assert '"aoi_todo"' in html
    assert '"hiromi_higuruma"' in html
    assert 'id="btn-v2-new-match"' not in html
    assert 'id="v2-lobby-view"' not in html
    assert 'id="v2-history-view"' not in html
    assert 'id="v2-setup-view"' not in html
    assert 'id="v2-battle-view"' not in html
    assert 'id="v2-result-view"' not in html
    assert 'id="v2-bottom-nav"' not in html
    assert 'v2-fighter-card' not in html
    assert 'v2-enemy-team' not in html
    assert 'v2-my-team' not in html
    assert 'vendor/phaser.min.js?v=3.90.0' in html
    assert 'phaser-design-tokens.js?v=18' in html
    assert 'phaser-shell.js?v=18' in html
    assert 'phaser-shell.css?v=1' in html
    assert 'phaser-battle.js' not in html
    assert 'app.js' not in html
    assert 'stitch-tokens.css' not in html
    assert 'stitch-archive.css' not in html
    assert 'stitch/generated/lobby-hero.jpg' not in html
    assert 'stitch/generated/victory-trophy.jpg' not in html
    assert 'Classic Queue Test' not in html


def test_battle_v2_public_surface_uses_production_copy(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    shell_js = Path(web_app.app.static_folder, "phaser-shell.js").read_text(encoding="utf-8")
    phaser_entry_js = Path(web_app.app.static_folder, "phaser", "index.js").read_text(encoding="utf-8")
    runtime_js = Path(web_app.app.static_folder, "phaser", "legacy-shell.js").read_text(encoding="utf-8")
    runtime_config_js = Path(web_app.app.static_folder, "phaser", "core", "runtime-config.js").read_text(encoding="utf-8")
    asset_registry_js = Path(web_app.app.static_folder, "phaser", "core", "asset-registry.js").read_text(encoding="utf-8")
    layout_service_js = Path(web_app.app.static_folder, "phaser", "core", "layout-service.js").read_text(encoding="utf-8")
    roster_js = Path(web_app.app.static_folder, "phaser", "core", "roster.js").read_text(encoding="utf-8")
    event_metrics_js = Path(web_app.app.static_folder, "phaser", "fx", "event-metrics.js").read_text(encoding="utf-8")
    combat_playback_js = Path(web_app.app.static_folder, "phaser", "fx", "combat-playback-scene.js").read_text(encoding="utf-8")
    base_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "base-scene.js").read_text(encoding="utf-8")
    combat_queue_review_js = Path(web_app.app.static_folder, "phaser", "scenes", "combat-queue-review-scene.js").read_text(encoding="utf-8")
    scene_registry_js = Path(web_app.app.static_folder, "phaser", "scenes", "scene-registry.js").read_text(encoding="utf-8")
    boot_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "boot-scene.js").read_text(encoding="utf-8")
    lobby_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "lobby-scene.js").read_text(encoding="utf-8")
    draft_roster_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "draft-roster-scene.js").read_text(encoding="utf-8")
    draft_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "draft-scene.js").read_text(encoding="utf-8")
    first_creation_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "first-creation-scene.js").read_text(encoding="utf-8")
    mission_map_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "mission-map-scene.js").read_text(encoding="utf-8")
    combat_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "combat-scene.js").read_text(encoding="utf-8")
    result_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "result-scene.js").read_text(encoding="utf-8")
    records_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "records-scene.js").read_text(encoding="utf-8")
    game_store_js = Path(web_app.app.static_folder, "phaser", "store", "game-store.js").read_text(encoding="utf-8")
    socket_client_js = Path(web_app.app.static_folder, "phaser", "network", "socket-client.js").read_text(encoding="utf-8")
    design_tokens_js = Path(web_app.app.static_folder, "phaser-design-tokens.js").read_text(encoding="utf-8")

    assert "import(`./phaser/index.js?v=${SHELL_VERSION}`)" in shell_js
    assert "import './legacy-shell.js?v=18';" in phaser_entry_js
    assert "from './store/game-store.js?v=18';" in runtime_js
    assert "from './network/socket-client.js?v=18';" in runtime_js
    assert "from './scenes/scene-registry.js?v=18';" in runtime_js
    assert "scene: SCENE_LIST" in runtime_js
    assert "from './scenes/boot-scene.js?v=18';" not in runtime_js
    assert "from './boot-scene.js?v=18';" in scene_registry_js
    assert "export const SCENE_LIST" in scene_registry_js
    assert "export const COLORS" in runtime_config_js
    assert "selectionGold" in design_tokens_js
    assert "cursedTeal" in design_tokens_js
    assert "talismanPaper" in design_tokens_js
    assert "COLORS.target" in combat_scene_js
    assert "COLORS.selection" in combat_scene_js
    assert "COLORS.domain" in combat_playback_js
    assert "export class AssetRegistry" in asset_registry_js
    assert "export class LayoutService" in layout_service_js
    assert "export function firstCreationRoster" in roster_js
    assert "export function eventAmount" in event_metrics_js
    assert "export class CombatPlaybackScene" in combat_playback_js
    assert "export class BaseScene" in base_scene_js
    assert "export class CombatQueueReviewScene" in combat_queue_review_js
    assert "export class DraftRosterScene" in draft_roster_scene_js
    assert "export class BootScene" in boot_scene_js
    assert "export class LobbyScene" in lobby_scene_js
    assert "export class DraftScene" in draft_scene_js
    assert "extends DraftRosterScene" in draft_scene_js
    assert "export class FirstCreationScene" in first_creation_scene_js
    assert "export class MissionMapScene" in mission_map_scene_js
    assert "export class CombatScene" in combat_scene_js
    assert "extends CombatQueueReviewScene" in combat_scene_js
    assert "export class ResultScene" in result_scene_js
    assert "export class RecordsScene" in records_scene_js
    assert "export class GameStore" in game_store_js
    assert "export class SocketClient" in socket_client_js
    assert "class BaseScene" not in runtime_js
    assert "class GameStore" not in runtime_js
    assert "class SocketClient" not in runtime_js
    assert "class BootScene" not in runtime_js
    assert "class LobbyScene" not in runtime_js
    assert "class FirstCreationScene" not in runtime_js
    assert "class MissionMapScene" not in runtime_js
    assert "class DraftScene" not in runtime_js
    assert "class CombatScene" not in runtime_js
    assert "class ResultScene" not in runtime_js
    assert "class RecordsScene" not in runtime_js
    assert "renderBootSplash" in boot_scene_js
    assert "OPENING DOMAIN" in boot_scene_js
    assert "battle_v2_start_classic" in game_store_js
    assert "battle_v2_submit_plan" in game_store_js
    assert "battle_v2_update_queue" in game_store_js
    assert "battle_v2_confirm_queue" in game_store_js
    assert "battle_v2_convert_energy" in game_store_js
    assert "playEvent(event, frame, visibleActionNumber)" in combat_playback_js
    assert "playActionBanner(frame" in combat_playback_js
    assert "playCinematicCurtain(frame)" in combat_playback_js
    assert "playCinematicCutIn" in combat_playback_js
    assert "CINEMATIC CUT-IN" in combat_playback_js
    assert "DOMAIN RESOLUTION" in combat_playback_js
    assert "playSlashLine" in combat_playback_js
    assert "playEvent(event, frame, visibleActionNumber)" not in combat_scene_js
    assert "renderQueueReviewSheet(frame)" in combat_queue_review_js
    assert "renderQueueReviewRow(frame" in combat_queue_review_js
    assert "Confirm Queue" in combat_queue_review_js
    assert "renderQueueReviewSheet(frame) {" not in combat_scene_js
    assert "consumePlaybackEvents" in game_store_js
    assert "renderReplayLine" in combat_scene_js
    assert "QUEUE ${this.store.actions.length}/3" in combat_scene_js
    assert "Review ${this.store.actions.length}/3" in combat_scene_js
    assert "YOUR FIELD" in combat_scene_js
    assert "BIGGEST STRIKES" in result_scene_js
    assert "MISSION PROGRESS" in result_scene_js
    assert "REWARD CHECK" in result_scene_js
    assert "FASTEST WIN" in records_scene_js
    assert "BIGGEST HIT" in records_scene_js
    assert "TOTAL DAMAGE" in records_scene_js
    assert "TECHNIQUE DOSSIER" in draft_roster_scene_js
    assert "Student Era Route" in mission_map_scene_js
    assert "setDraftTarget" in game_store_js
    assert "jjk:ui-tap" in base_scene_js
    assert "Classic Queue Test" not in html
    assert "Classic Queue Test" not in runtime_js
    assert "Classic Arena v2" not in html
    assert "Battle v2 Arena" not in html
    assert "dev surface" not in runtime_js.lower()
    assert "document.getElementById('btn-join')" not in runtime_js
    assert "showScreen('game-arena')" not in runtime_js
    assert "showScreen('battle-arena')" not in runtime_js
    assert "showScreen('team-selection')" not in runtime_js


def test_index_exposes_first_creation_payload_when_battle_v2_enabled(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)

    assert "const FIRST_CREATION =" in html
    assert '"availability": "starter"' in html
    assert '"era": "student_era"' in html
    assert '"satoru_gojo_young"' in html
    assert '"yuta_okkotsu_jjk0"' in html
    assert '"mahito"' in html  # locked variant list, not the starter roster
    runtime_js = Path(web_app.app.static_folder, "phaser", "legacy-shell.js").read_text(encoding="utf-8")
    roster_js = Path(web_app.app.static_folder, "phaser", "core", "roster.js").read_text(encoding="utf-8")
    draft_roster_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "draft-roster-scene.js").read_text(encoding="utf-8")
    first_creation_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "first-creation-scene.js").read_text(encoding="utf-8")
    combat_scene_js = Path(web_app.app.static_folder, "phaser", "scenes", "combat-scene.js").read_text(encoding="utf-8")
    game_store_js = Path(web_app.app.static_folder, "phaser", "store", "game-store.js").read_text(encoding="utf-8")
    assert "BOOT.firstCreation && BOOT.firstCreation.roster" in roster_js
    assert "roster_mode: 'first_creation'" in game_store_js
    assert "applyPreset" in game_store_js
    assert "applyRecommendedTeam" in game_store_js
    assert "renderRosterCard" in draft_roster_scene_js
    assert "renderStarterRosterCard" in draft_roster_scene_js
    assert "renderCharacterDetailSheet" in draft_roster_scene_js
    assert "MISSION OBJECTIVE" in draft_roster_scene_js
    assert "renderStarterRosterCard" in first_creation_scene_js
    assert "renderCharacterDetailSheet" in first_creation_scene_js
    assert "ACTIVE TRIO" in first_creation_scene_js
    assert "ROUTES" in first_creation_scene_js
    assert "Choose ${3 - this.store.playerTeam.length} More" in first_creation_scene_js
    assert "renderSkillButton" in combat_scene_js
    assert "Choose technique" in combat_scene_js
    assert "completed_missions" in html
    assert "unlock_registry" in html
    assert "first_creation_account" not in runtime_js
    # Regression: mission counters/unlocks/active route previously only ever
    # came from this page-load bootstrap payload, so they never updated
    # after a match finished without a full reload. game-store.js must now
    # store first_creation_account live from battle_v2_update and prefer it
    # over the bootstrap snapshot.
    assert "data.first_creation_account" in game_store_js
    assert "firstCreationProfile" in game_store_js


def test_v2_page_uses_phaser_container_css_not_stitch_bridge(monkeypatch):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    client = web_app.app.test_client()

    html = client.get("/").get_data(as_text=True)
    shell_css = Path(web_app.app.static_folder, "phaser-shell.css").read_text(encoding="utf-8")

    assert "phaser-shell.css" in html
    assert not Path(web_app.app.static_folder, "stitch").exists()
    assert "stitch-tokens.css" not in html
    assert "stitch-archive.css" not in html
    assert "#v2-phaser-shell canvas" in shell_css
    assert ".stitch-screen" not in shell_css
    assert ".v2-first-creation-guide" not in shell_css

def test_index_embeds_persisted_first_creation_profile(monkeypatch, tmp_path):
    monkeypatch.setenv("JJK_BATTLE_SYSTEM", "v2")
    monkeypatch.setenv("JJK_FIRST_CREATION_PROFILE_STORE", str(tmp_path / "profiles.json"))
    web_app.save_first_creation_profile("player-profile", {"completed_missions": ["welcome_to_jujutsu_high"], "unlocked": ["mission_board"]})
    client = web_app.app.test_client()
    with client.session_transaction() as flask_session:
        flask_session["player_id"] = "player-profile"

    html = client.get("/").get_data(as_text=True)

    assert '"completed_missions": ["welcome_to_jujutsu_high"]' in html
    assert '"unlocked": ["mission_board"]' in html
    assert '"owned": true' in html
