from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_home_is_a_hero_landing_screen_instead_of_the_old_dashboard():
    source = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")

    assert "const HOME_WORLD_KEY = 'culling-current-home-hero';" in source
    assert "drawCurrentWorld(this, frame, HOME_WORLD_KEY" in source
    assert "renderEditorialTitle" in source
    assert "renderBattleSlab" in source
    assert "renderFeatureTiles" in source
    # The generated full-screen hero composition is the runtime hero. Do not
    # regress to layering the old three-portrait collage over that artwork.
    assert "this.renderHeroComposition(layout.hero);" not in source
    assert "renderHeroTrio" not in source
    assert "YOUR ACTIVE TRIO" not in source
    assert "PROMOTIONAL KEY ART" in source
    assert "ACTIVE TRIO ${this.store.playerTeam.length}/3" in source
    assert "renderPromotionalHeroLabel(layout.hero)" in source
    assert "drawCurrentModeCard" not in source


def test_home_keeps_every_existing_route_and_identity_action():
    source = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")

    assert "editIdentity('name')" in source
    assert "editIdentity('room')" in source
    assert "this.store.setMatchMode('cpu')" in source
    assert "this.store.setMatchMode('pvp')" in source
    assert source.count("this.store.openFirstCreation()") >= 2
    assert "this.store.changeScene('MissionMapScene')" in source
    assert "this.store.changeScene('RecordsScene')" in source
    assert "this.store.changeScene('DraftScene')" in source


def test_home_has_one_primary_action_three_features_and_three_item_navigation():
    source = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")

    assert "READY FOR BATTLE" in source
    assert "QUICK MATCH" in source
    assert "'First Creation', 'ROSTER'" in source
    assert "'Missions', 'STORY'" in source
    assert "'Private Room', 'PVP'" in source
    assert "{ label: 'Home'" in source
    assert "{ label: 'Roster'" in source
    assert "{ label: 'Records'" in source


def test_home_regions_stay_separated_and_touch_targets_use_shared_registration():
    source = (ROOT / "web/static/phaser/scenes/lobby-scene.js").read_text(encoding="utf-8")

    assert "const navY = frame.bottom - navH" in source
    assert "const featureY = navY - featureH - 8" in source
    assert "const battleY = featureY - battleH - 8" in source
    # Profile identity, primary action, feature-card factory, and nav factory
    # all use the shared registration path, which expands every visual target
    # to the project's 44px minimum in BaseScene.
    assert source.count("registerHitTarget(") >= 5
