# GitHub to Guru
Create cards in a Guru collection based on content in a GitHub repo

## Outputs

### `created`

Number of Guru cards created

## Example usage

1. Add a Secret named `GURU_USER_TOKEN` containing a [User Token for Guru](https://help.getguru.com/articles/XipkRKLi/Guru-API-Overview)

2. Add a workflow file which responds to file changes:

```yaml
name: Create guru cards

on: [push]

jobs:
  guru:
    runs-on: ubuntu-latest
    steps:
    - uses: peckjon/github-to-guru@master
      env:
        GURU_USER_TOKEN:  '${{ secrets.GURU_USER_TOKEN }}'
```
