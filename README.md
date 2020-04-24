# GitHub to Guru
Create cards in a Guru collection based on content in a GitHub repo

## Outputs

### `created`

Number of Guru cards created

## Example usage

1. Add a Secret named `GURU_USER_TOKEN` containing a [User Token for Guru](https://help.getguru.com/articles/XipkRKLi/Guru-API-Overview)

2. Add a Secret named `GURU_USER_EMAIL` containing the email address for which you [created the User Token](https://app.getguru.com/settings/api-access)

3. Add a YAML file to your repo containing one entry for each markdown file you wish to add, specifying the card properties:

```
--- 
SomeFile.md: 
  Tags: 
    - "Subject One"
    - "Subject Two"
  Title: "This is Some Thing"
SomePath/SomeOtherFile.md: 
  Tags: 
    - "Subject One"
  Title: "This is Some Other Thing"
```

3. Add a workflow file which responds to file changes, setting GURU_COLLECTION_ID to the `id` of a collection found at https://api.getguru.com/api/v1/collections, and setting `GURU_CARD_YAML` as the name of the YAML file you created in the prior step.

```yaml
name: Create guru cards

on:
  push:
    branches:
      - master

jobs:
  guru:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: peckjon/github-to-guru@master
      env:
        GURU_USER_EMAIL:  '${{ secrets.GURU_USER_EMAIL }}'
        GURU_USER_TOKEN:  '${{ secrets.GURU_USER_TOKEN }}'
        GURU_COLLECTION_ID: '********-****-****-****-************'
        GURU_CARD_YAML: 'config.yaml'
```
