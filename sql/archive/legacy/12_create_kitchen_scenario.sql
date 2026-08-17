-- 주방 테마 Play Phase 시나리오 생성
-- 2분 동안 18개 트리거 배치

INSERT INTO play_scenarios (id, name, theme, duration, scenario_json)
VALUES (
  'kitchen_inferno',
  '주방의 불꽃',
  'kitchen',
  120,
  '{
    "id": "KITCHEN_INFERNO",
    "name": "주방의 불꽃",
    "theme": "kitchen",
    "total_time": 120,
    "background": {
      "type": "3d",
      "scene_config": {
        "fog_color": "#1a1a2e",
        "fog_near": 500,
        "fog_far": 3800,
        "ambient_light": 0.7,
        "point_lights": [
          {
            "color": "#ff6600",
            "intensity": 15,
            "position": { "x": 0, "y": 2000, "z": 1000 }
          }
        ]
      }
    },
    "timeline": [
      {
        "start": 0,
        "end": 30,
        "trigger": {
          "type": "FLICKER",
          "interval": 1.0,
          "intensity": "MID"
        },
        "action": "TURN",
        "visual_effect": {
          "object_type": "flame",
          "position": { "x": 50, "y": 50, "z": -1000 },
          "scale": 1.0,
          "animation_key": "gas_stove_flicker",
          "color": "#ff6600"
        },
        "repetition": {
          "count": 10,
          "interval": 1.0,
          "variation": "alternating"
        },
        "sound_effect": {
          "type": "trigger",
          "frequency": 400,
          "duration": 0.1
        }
      },
      {
        "start": 30,
        "end": 60,
        "trigger": {
          "type": "SWEEP",
          "speed": 0.8,
          "random_delay": [1, 3],
          "intensity": "MID"
        },
        "action": "DUCK",
        "visual_effect": {
          "object_type": "pan",
          "position": { "x": 0, "y": 20, "z": -1500 },
          "scale": 1.2,
          "animation_key": "horizontal_slide",
          "rotation": { "z": 15 }
        },
        "repetition": {
          "count": 8,
          "interval": 3.5,
          "variation": "random"
        }
      },
      {
        "start": 60,
        "end": 90,
        "trigger": {
          "type": "BURST",
          "count": 3,
          "intensity": "HIGH"
        },
        "action": "JUMP",
        "visual_effect": {
          "object_type": "popcorn",
          "position": { "x": 50, "y": 50, "z": -1200 },
          "scale": 1.5,
          "animation_key": "popcorn_explosion"
        },
        "repetition": {
          "count": 5,
          "interval": 5.0,
          "variation": "sequential"
        }
      },
      {
        "start": 90,
        "end": 120,
        "trigger": {
          "type": "APPROACH",
          "speed": 0.6,
          "intensity": "HIGH"
        },
        "action": "PUSH",
        "visual_effect": {
          "object_type": "wall",
          "position": { "x": 50, "y": 50, "z": -2000 },
          "scale": 2.0,
          "animation_key": "approaching_wall",
          "color": "#FF8C42"
        },
        "repetition": {
          "count": 3,
          "interval": 8.0,
          "variation": "sequential"
        }
      },
      {
        "start": 15,
        "end": 45,
        "trigger": {
          "type": "PULSE",
          "interval": 2.0,
          "intensity": "LOW"
        },
        "action": "POINT",
        "visual_effect": {
          "object_type": "steam",
          "position": { "x": 30, "y": 70, "z": -1100 },
          "scale": 1.0,
          "animation_key": "steam_rise"
        },
        "repetition": {
          "count": 6,
          "interval": 4.0,
          "variation": "alternating"
        }
      },
      {
        "start": 45,
        "end": 75,
        "trigger": {
          "type": "ROTATE",
          "speed": 1.0,
          "intensity": "MID"
        },
        "action": "TURN",
        "visual_effect": {
          "object_type": "knife",
          "position": { "x": 70, "y": 30, "z": -1300 },
          "scale": 1.3,
          "animation_key": "knife_slash",
          "rotation": { "z": 45 }
        },
        "repetition": {
          "count": 7,
          "interval": 4.0,
          "variation": "alternating"
        }
      },
      {
        "start": 75,
        "end": 105,
        "trigger": {
          "type": "EXPLODE",
          "intensity": "HIGH"
        },
        "action": "PUNCH",
        "visual_effect": {
          "object_type": "spark",
          "position": { "x": 50, "y": 50, "z": -1000 },
          "scale": 2.0,
          "animation_key": "spark_burst",
          "color": "#FFD700"
        },
        "repetition": {
          "count": 4,
          "interval": 6.0,
          "variation": "random"
        }
      },
      {
        "start": 105,
        "end": 120,
        "trigger": {
          "type": "SWEEP",
          "speed": 1.2,
          "intensity": "HIGH"
        },
        "action": "DUCK",
        "visual_effect": {
          "object_type": "pan",
          "position": { "x": 50, "y": 40, "z": -800 },
          "scale": 1.5,
          "animation_key": "fast_slide",
          "rotation": { "z": 30 }
        },
        "repetition": {
          "count": 3,
          "interval": 4.0,
          "variation": "sequential"
        }
      }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  theme = EXCLUDED.theme,
  duration = EXCLUDED.duration,
  scenario_json = EXCLUDED.scenario_json,
  updated_at = NOW();
