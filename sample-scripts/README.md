# Scripts to sync a repository to a Guru Collection

## Create a synced collection

- See [here](https://developer.getguru.com/docs/guru-sync-manual-api#api-implementation) for instructions

## Create initial YAML files for the collection

### Preparation

```py
pip3 install -r "scripts/requirements.txt"
```

_Assuming `Sales Collection` is the top level folder that would represent the collection level in Guru_

### Suggested usage to create cards.yaml

From a terminal, in the root of this repo, run:

```bash
rm "Sales Collection/guru/cards.yaml"; rm "Sales Collection/guru/collection.yaml"; python3 scripts/create_card_yaml.py "./Sales Collection" "Sales Collection/guru/cards.yaml"  "Sales Collection/guru/collection.yaml"`
```

### Suggested usage to create boards.yaml and boardgroups.yaml

From a terminal, in the root of this repo, run:

```bash
rm Sales\ Collection/guru/boards.yaml; rm Sales\ Collection/guru/boardgroups.yaml; python3 scripts/create_board_yaml.py "./Sales Collection" "Sales Collection/guru/boards.yaml" "Sales Collection/guru/boardgroups.yaml"
```

## Set up Actions to sync collection

- See [github-to-guru Action](https://github.com/peckjon/github-to-guru)

## Troubleshooting Guide

Use the job ID that returns from `GURU_SYNC_RESPONSE` to check on the sync status via the API:

```
curl -u EMAIL:TOKEN https://api.getguru.com/api/v1/import/{jobId}/status
```

- See [API Implementation](https://developer.getguru.com/docs/guru-sync-manual-api#api-implementation)
- Other resource:
  - [Guru Manual Sync API](https://developer.getguru.com/docs/guru-sync-manual-api#boards)