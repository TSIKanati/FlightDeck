# The Highrise - Canonical Home: URBot.net

This codebase has been migrated to the **URBot** repository as its primary home.

## Canonical Repository
- **URBot repo** is the primary home for The Highrise 3D Command Center
- FlightDeck/highrise remains as an accessory viewer and development workspace
- All changes should be pushed to BOTH remotes

## Remotes
- `origin` - FlightDeck (this repo)
- `urbot` - URBot.net (canonical home)

## Push Protocol
```bash
git subtree push --prefix=FlightDeck/highrise urbot main
```

## Architecture
The Highrise IS the URBot vision stack (see `js/data/urbot-vision-stack.json`).
Both towers are now fully operational:
- **LEFT Tower**: BeeFrank C2 -> FloorManagers -> Build/Design/Code Agents
- **RIGHT Tower**: Sally C2 -> FloorManagers -> Server/Deploy/Monitor Agents
