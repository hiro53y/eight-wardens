# 使う絵を軽い WebP にして public/assets/v2/ に置く（元の PNG は残す）
#   python scripts/make-webp.py
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
OUT = os.path.join(PUB, 'assets', 'v2')

# (元, 出力名, 最大の幅, 品質)
ITEMS = [
    ('assets/game/backgrounds/battle_village_gate_day.png', 'battle.webp', 1672, 80),
    ('assets/game/backgrounds/chapter1_world_map.png', 'map.webp', 1672, 78),
    ('assets/generated/title-background.png', 'title.webp', 1672, 78),
    ('assets/game/backgrounds/result_stage_clear_bg.png', 'result.webp', 1280, 72),
    ('assets/generated/warden-chibi-sheet-transparent.png', 'wardens.webp', 1536, 88),
    ('assets/generated/enemy-chibi-sheet-transparent.png', 'enemies.webp', 1774, 88),
    ('assets/generated/unit-portraits-sheet-transparent.png', 'portraits.webp', 1774, 84),
    ('assets/game/enemies/enemy_goblin.png', 'enemy_goblin.webp', 477, 88),
    ('assets/game/enemies/enemy_orc.png', 'enemy_orc.webp', 683, 88),
    ('assets/game/enemies/enemy_wolf_elite.png', 'enemy_wolf_elite.webp', 641, 88),
    ('assets/game/enemies/enemy_wingbat.png', 'enemy_wingbat.webp', 594, 88),
    ('assets/game/banners/banner_wave_start.png', 'banner_wave.webp', 900, 85),
    ('assets/game/banners/banner_boss_warning.png', 'banner_boss.webp', 900, 85),
    ('assets/game/banners/banner_elite_warning.png', 'banner_elite.webp', 900, 85),
    ('assets/game/banners/banner_stage_clear.png', 'banner_clear.webp', 900, 85),
    ('assets/game/banners/deco_three_star_clear.png', 'deco_stars.webp', 600, 85),
    ('assets/game/effects/fx_slash_blue.png', 'fx_slash.webp', 400, 85),
    ('assets/game/effects/fx_hit_flash_orange.png', 'fx_hit.webp', 400, 85),
    ('assets/game/effects/fx_magic_bolt_purple.png', 'fx_magic.webp', 400, 85),
    ('assets/game/effects/fx_buff_ring_gold.png', 'fx_buff.webp', 400, 85),
    ('assets/game/effects/fx_heal_ring_green.png', 'fx_heal.webp', 400, 85),
    ('assets/game/effects/fx_holy_sparkle_white.png', 'fx_sparkle.webp', 400, 85),
    ('assets/game/effects/fx_target_ring_red.png', 'fx_target.webp', 400, 85),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for src, name, maxw, q in ITEMS:
        im = Image.open(os.path.join(PUB, src))
        im = im.convert('RGBA')
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        dst = os.path.join(OUT, name)
        im.save(dst, 'WEBP', quality=q, method=6)
        print(f'{name} {im.size} {os.path.getsize(dst) // 1024}KB')


if __name__ == '__main__':
    main()
