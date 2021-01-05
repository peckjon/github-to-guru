const axios = require(`axios`);
const fs = require(`fs-extra`);
const tmp = require(`tmp`);
const yaml = require('yaml')
const core = require(`@actions/core`);
const exec = require('@actions/exec');
const github = require(`@actions/github`);

async function getCollection(auth, collectionId) {
  console.log(`collection: ${collectionId}`)
  return axios.get(`https://api.getguru.com/api/v1/collections/`+collectionId, {auth: auth})
}

async function apiSendSynchedCollection(sourceDir, auth, collectionId) {
  console.log(`\n--- SENDING ZIPFILE ---`);
  let options = {};
  options.cwd=sourceDir;
  await exec.exec(`zip`, [`-r`,`guru_collection.zip`,`./`], options);
  if (process.env.DEBUG) {
    console.log(`DEBUG mode: not deploying ${sourceDir}/guru_collection.zip to https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId}`);
  } else {
    await exec.exec(`curl -u ${auth.username}:${auth.password} https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId} -F "file=@${sourceDir}/guru_collection.zip" -D -`);
  }
}

async function apiSendStandardCard(auth, collectionId, title, content) {
  console.log(`creating card in ${collectionId}: ${title}`)
  let headers = {
    auth: auth,
    'content-type': `application/json`
  };
  let data = {
    preferredPhrase: title,
    content: content,
    htmlContent: false,
    collection: {id: collectionId}
  }
  return axios.post(`https://api.getguru.com/api/v1/facts/extended`, data, headers)
}

function copyCollectionData(targetDir) {
  console.log(`\n--- PROCESSING COLLECTION DATA---`);
  if (process.env.GURU_COLLECTION_YAML) {
    console.log(`Copying ${process.env.GURU_COLLECTION_YAML} to ${targetDir}/collection.yaml`);
    fs.copySync(process.env.GURU_COLLECTION_YAML, `${targetDir}/collection.yaml`);
  }
  else {
    console.log(`Writing '---' to ${targetDir}/collection.yaml:`);
    fs.writeFileSync(`${targetDir}/collection.yaml`, `--- ~\n`);
  }
}

function copyCardData(tmpCardsDir) {
  console.log(`\n--- PROCESSING CARD DATA ---`);
  if(process.env.GURU_CARD_YAML) {
    let cardConfigs = yaml.parse(fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8'));
    console.log(yaml.stringify(cardConfigs))
    for (let cardFilename in cardConfigs) try {
      if(!fs.existsSync(cardFilename)) {
        core.setFailed(`Cannot find file specified in ${process.env.GURU_CARD_YAML}: ${cardFilename}`);
        return;
      };
      let tmpfileBase=cardFilename.replace(/\.md$/gi,'').replace(/[^a-zA-Z0-9]/gi, '_');
      while(fs.existsSync(`${tmpCardsDir}/${tmpfileBase}.yaml`)) {
        tmpfileBase+=`_`;
      }
      console.log(`Writing ${cardFilename.replace(/\.md$/gi,'')} to ${tmpCardsDir}/${tmpfileBase}.yaml`);
      fs.copySync(cardFilename,`${tmpCardsDir}/${tmpfileBase}.md`);
      let cardConfig = cardConfigs[cardFilename];
      if (!cardConfig.ExternalId) {
        cardConfig.ExternalId = `${process.env.GITHUB_REPOSITORY}/${cardFilename}`
      }
      if (!cardConfig.ExternalUrl) {
        cardConfig.ExternalUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/master/${cardFilename}`
      }
      let cardYaml=yaml.stringify(cardConfig);
      fs.writeFileSync(`${tmpCardsDir}/${tmpfileBase}.yaml`, cardYaml);
    } catch (error) {
      core.setFailed(`Unable to prepare tempfiles: ${error.message}`);
      return;
    }
  } else {
    console.log(`Copying ${process.env.GURU_CARD_DIR} to ${tmpCardsDir}`);
    fs.copySync(process.env.GURU_CARD_DIR, tmpCardsDir);
  }
  if (process.env.GURU_RESOURCES_DIR) {
    console.log(`Updating relative links to resources in ${process.env.GURU_RESOURCES_DIR}`);
    const resourcesregex = new RegExp(`(\.\.\/)+${process.env.GURU_RESOURCES_DIR}\/`);
    console.log(resourcesregex);
    const dir = fs.opendirSync(tmpCardsDir);
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      if (dirent.name.endsWith('.md')) {
        let olds = fs.readFileSync(`${tmpCardsDir}/${dirent.name}`, 'utf8');
        let news = olds.replace(resourcesregex,'resources/');
        if (olds!=news) {
          console.log(`Updated ${dirent.name}`);
          fs.writeFileSync(`${tmpCardsDir}/${dirent.name}`, news);
        }
      }
    }
    dir.closeSync();
  }
  if (process.env.GURU_CARD_FOOTER) {
    let cardFooter = `\n---\n${process.env.GURU_CARD_FOOTER}\n`;
    console.log(`Adding card footer: ${cardFooter}`);
    const dir = fs.opendirSync(tmpCardsDir);
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      if (dirent.name.endsWith('.md')) {
        fs.appendFileSync(`${tmpCardsDir}/${dirent.name}`, cardFooter);
      }
    }
    dir.closeSync();
  }
}

function copyBoardData(tmpBoardsDir, cardFileList) {
  console.log(`\n--- PROCESSING BOARD DATA---`);
  if (process.env.GURU_BOARD_YAML) {
    let boardConfigs = yaml.parse(fs.readFileSync(process.env.GURU_BOARD_YAML, 'utf8'));
    console.log(yaml.stringify(boardConfigs))
    let i=1;
    for (let boardName in boardConfigs) {
      for (let item in boardConfigs[boardName]['Items']) {
        let cardYamlFile = boardConfigs[boardName]['Items'][item].ID+'.yaml';
        if (!cardFileList.includes(cardYamlFile)) {
          core.setFailed(`Error in board ${boardName}: cannot find ${cardYamlFile} in cards [${cardFileList}]`);
          return;
        }
      }
      let targetFile = `${tmpBoardsDir}/board${i++}.yaml`
      console.log(`Writing ${boardName} to ${targetFile}`);
      let boardYaml=yaml.stringify(boardConfigs[boardName]);
      fs.writeFileSync(`${targetFile}`, boardYaml);
    }
  }
  else if (process.env.GURU_BOARD_DIR) {
    console.log(`Copying ${process.env.GURU_BOARD_DIR} to ${tmpBoardsDir}`);
    fs.copySync(process.env.GURU_BOARD_DIR, `${tmpBoardsDir}`);
  }
}

function copyBoardGroupData(tmpBoardGroupsDir, boardFileList) {
  console.log(`\n--- PROCESSING BOARDGROUP DATA ---`);
  if (process.env.GURU_BOARDGROUP_YAML) {
    let boardGroupConfigs = yaml.parse(fs.readFileSync(process.env.GURU_BOARDGROUP_YAML, 'utf8'));
    console.log(yaml.stringify(boardGroupConfigs));
    let i=1;
    for (let boardGroupName in boardGroupConfigs) {
      for (let item in boardGroupConfigs[boardGroupName]['Boards']) {
        let boardYamlFile = boardGroupConfigs[boardGroupName]['Boards'][item]+'.yaml';
        if (!boardFileList.includes(boardYamlFile)) {
          core.setFailed(`Error in boardgroup ${boardGroupName}: cannot find ${boardYamlFile} in cards [${boardFileList}]`);
          return;
        }
      }
      let targetFile = `${tmpBoardGroupsDir}/board-group${i++}.yaml`
      console.log(`Writing ${boardGroupName} to ${targetFile}`);
      let boardGroupYaml=yaml.stringify(boardGroupConfigs[boardGroupName]);
      fs.writeFileSync(`${targetFile}`, boardGroupYaml);
    }
  }
  else if (process.env.GURU_BOARDGROUP_DIR) {
    console.log(`Copying ${process.env.GURU_BOARDGROUP_DIR} to ${tmpBoardGroupsDir}`);
    fs.copySync(process.env.GURU_BOARDGROUP_DIR, `${tmpBoardGroupsDir}`);
  }
}

function copyResources(tmpResourcesDir) {
  console.log(`\n--- PROCESSING RESOURCES ---`);
  if (process.env.GURU_RESOURCES_DIR) {
    console.log(`Copying ${process.env.GURU_RESOURCES_DIR} to ${tmpResourcesDir}`);
    fs.copySync(process.env.GURU_RESOURCES_DIR, `${tmpResourcesDir}`);
  }
}

function processExternalCollection(auth) {
  //create tmp dirs to hold zipfile data
  let tmpdir = tmp.dirSync();
  console.log('tmpdir: ', tmpdir.name);
  let tmpCardsDir = `${tmpdir.name}/cards`;
  fs.mkdirSync(tmpCardsDir);
  let tmpBoardsDir = `${tmpdir.name}/boards`;
  fs.mkdirSync(tmpBoardsDir);
  let tmpResourcesDir = `${tmpdir.name}/resources`;
  fs.mkdirSync(tmpResourcesDir);
  let tmpBoardGroupsDir = `${tmpdir.name}/board-groups`;
  fs.mkdirSync(tmpBoardGroupsDir);
  //populate collection, card, board, boardgorup, resources
  copyCollectionData(tmpdir.name);
  copyCardData(tmpCardsDir);
  let cardFileList = fs.readdirSync(tmpCardsDir, {withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.name);
  copyBoardData(tmpBoardsDir, cardFileList);
  let boardFileList = fs.readdirSync(tmpBoardsDir, {withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.name);
  copyBoardGroupData(tmpBoardGroupsDir, boardFileList);
  copyResources(tmpResourcesDir);
  //zip and send to Guru
  apiSendSynchedCollection(tmpdir.name,auth,process.env.GURU_COLLECTION_ID).catch(error => {
    core.setFailed(`Unable to sync collection: ${error.message}`);
  });
}

function processStandardCollection(auth) {
  if(process.env.GURU_CARD_DIR) {
    core.setFailed("GURU_CARD_DIR is only supported for EXTERNAL collections: https://developer.getguru.com/docs/guru-sync-manual-api");
    return;
  } else {
    let cardConfigs = yaml.parse(fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8'));
    for (let cardFilename in cardConfigs) try {
      apiSendStandardCard(
        auth,
        process.env.GURU_COLLECTION_ID,
        cardConfigs[cardFilename].Title,
        fs.readFileSync(cardFilename, 'utf8')
      ).then(response => {
        console.log(`Created card for ${cardFilename}`);
      }).catch(error => {
        core.setFailed(`Unable to create card for ${cardFilename}: ${error.message}`);
      });
    } catch (error) {
      core.setFailed(`Unable to prepare card: ${error.message}`);
    }
  }
}

try {
  let auth = {
    username: process.env.GURU_USER_EMAIL,
    password: process.env.GURU_USER_TOKEN
  };
  getCollection(
    auth,
    process.env.GURU_COLLECTION_ID
  ).then(response => {
    console.log(`Found ${response.data.collectionType} collection at https://app.getguru.com/collections/${response.data.slug} with ${response.data.cards} cards (${response.data.publicCards} publc)`);
    let isExternalCollection = response.data.collectionType == `EXTERNAL`;
    if(!(process.env.GURU_CARD_DIR||process.env.GURU_CARD_YAML)) {
      core.setFailed(`Specify either GURU_CARD_DIR or GURU_CARD_YAML`);
      return;
    }
    if(
      (process.env.GURU_CARD_DIR && ([process.env.GURU_BOARD_DIR, process.env.GURU_BOARDGROUP_DIR].includes(process.env.GURU_CARD_DIR)) )
      || (process.env.GURU_BOARD_DIR && (process.env.GURU_BOARD_DIR == process.env.GURU_BOARDGROUP_DIR) )
      ) {
      core.setFailed(`GURU_CARD_DIR, GURU_BOARD_DIR, and GURU_BOARDGROUP_DIR must be different.`);
      return;
    }
    if(
      (process.env.GURU_COLLECTION_YAML && [process.env.GURU_CARD_YAML, process.env.GURU_BOARD_YAML, process.env.GURU_BOARDGOUP_YAML].includes(process.env.GURU_COLLECTION_YAML))
      || (process.env.GURU_CARD_YAML && ([process.env.GURU_BOARD_YAML, process.env.GURU_BOARDGROUP_YAML].includes(process.env.GURU_CARD_YAML)) )
      || (process.env.GURU_BOARD_YAML && (process.env.GURU_BOARD_YAML == process.env.GURU_BOARDGROUP_YAML) )
      ) {
      core.setFailed(`GURU_COLLECTION_YAML, GURU_CARD_YAML, GURU_BOARD_YAML, and GURU_BOARDGROUP_YAML must be different.`);
      return;
    }
    if(isExternalCollection) {
      processExternalCollection(auth);
    } else {
      processStandardCollection(auth);
    }
  }).catch(error => {
    core.setFailed(`Unable to get collection info: ${error.message}`);
  });
} catch (error) {
  core.setFailed(error.message);
}

