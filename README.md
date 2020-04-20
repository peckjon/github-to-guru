# Vulnerability to Azure Board
Create a Work Item on an Azure Board when a Security Vulnerability is found

## Outputs

### `id`

The id of the Work Item created

## Example usage

1. Ensure that [Automated Security Updates](https://help.github.com/en/github/managing-security-vulnerabilities/configuring-automated-security-updates) are enabled for your repository

2. Add a Secret named `PERSONAL_TOKEN` containing a [GitHub Personal Access Token](https://github.com/settings/tokens) with the "repo" scope

3. Add a Secret named `AZURE_PERSONAL_ACCESS_TOKEN` containing an [Azure Personal Access Token](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate) with "read & write" permission for Work Items

4. Add a workflow file which responds to Pull Requests, customizing the ORG_URL and PROJECT_NAME properties:

```yaml
name: Check for vulnerabilities

'on':
  pull_request:
    branches:
      - master

jobs:
  alert:
    runs-on: ubuntu-latest
    steps:
    - uses: peckjon/vulnerability-to-azure-board@master
      env:
        GITHUB_TOKEN: '${{ secrets.PERSONAL_TOKEN }}'
        AZURE_PERSONAL_ACCESS_TOKEN: '${{ secrets.AZURE_PERSONAL_ACCESS_TOKEN }}'
        ORG_URL: 'https://dev.azure.com/your_org_name'
        PROJECT_NAME: 'your_project_name'
```
