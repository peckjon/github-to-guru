const axios = require(`axios`);
const fs = require(`fs-extra`);
const tmp = require(`tmp`);
const yaml = require('yaml')
const core = require(`@actions/core`);
const exec = require('@actions/exec');
const github = require(`@actions/github`);
const markdownit = require('markdown-it')({
  html: true,
  linkify: true
});

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
    let curl_cmd = `curl --silent -u ${auth.username}:${auth.password} https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId} -F "file=@${sourceDir}/guru_collection.zip"`
    fs.writeFile('runguru.sh',`#!/bin/sh
    GURU_SYNC_RESPONSE=$(`+curl_cmd+`)
    echo $GURU_SYNC_RESPONSE
    echo "GURU_SYNC_RESPONSE=\"$GURU_SYNC_RESPONSE\"" >> $GITHUB_ENV
    `)
    await exec.exec(`chmod u+x runguru.sh`);
    await exec.exec(`sh runguru.sh`);
  }
}

async function apiSendStandardCard(auth, collectionId, title, content) {
  console.log(`creating card in ${collectionId}: ${title}`)
  const headers = {
    auth: auth,
    'content-type': `application/json`
  };
  const data = {
    preferredPhrase: title,
    content: content,
    htmlContent: false,
    collection: {id: collectionId}
  }
  return axios.post(`https://api.getguru.com/api/v1/facts/extended`, data, headers)
}

function copyCollectionData(targetDir, tmpCardsDir) {
  console.log(`\n--- PROCESSING COLLECTION DATA---`);
  var allTags=[];
  var files=fs.readdirSync(tmpCardsDir);
  for(var i=0;i<files.length;i++){
      var filename=`${tmpCardsDir}/${files[i]}`;
      if(filename.endsWith('.yaml')) {
        var cardYaml = yaml.parse(fs.readFileSync(filename, 'utf8'));
        for(tag in cardYaml['Tags']) {
          if(allTags.indexOf(cardYaml['Tags'][tag])<0) {
            allTags.push(cardYaml['Tags'][tag]);
          }
        }
      }
  };
  if (process.env.GURU_COLLECTION_YAML) {
    if(allTags.length) {
      var collectionYaml = yaml.parse(fs.readFileSync(process.env.GURU_COLLECTION_YAML, 'utf8'));
      if(!(collectionYaml&&collectionYaml['Tags'])) {
        core.setFailed(`No tags are specified in collection.yaml, but tags are present in cards`);
      }
      else for(tag in allTags) {
        if((!collectionYaml['Tags']) || collectionYaml['Tags'].indexOf(allTags[tag])<0) {
          core.setFailed(`Tag is specified in a card but not present in collection.yaml: ${allTags[tag]}`);
        }
      }
    }
    console.log(`Copying ${process.env.GURU_COLLECTION_YAML} to ${targetDir}/collection.yaml`);
    fs.copySync(process.env.GURU_COLLECTION_YAML, `${targetDir}/collection.yaml`);
  }
  else {
    collectionYaml = `--- ~\n`;
    if(allTags.length) {
      collectionYaml = `Tags:\n`
      for(tag in allTags) {
        collectionYaml += `  - "${allTags[tag]}"\n`
      }
      collectionYaml += `\n`
    }
    console.log(`Writing ${targetDir}/collection.yaml:`);
    fs.writeFileSync(`${targetDir}/collection.yaml`, collectionYaml);
  }
}

function copyCardData(tmpCardsDir) {
  console.log(`\n--- PROCESSING CARD DATA ---`);
  const cardFooter = process.env.GURU_CARD_FOOTER?`\n---\n${process.env.GURU_CARD_FOOTER}\n`:'';
  if(process.env.GURU_CARD_YAML) {
    const cardConfigs = yaml.parse(fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8'));
    console.log(yaml.stringify(cardConfigs))
    for (let cardFilename in cardConfigs) try {
      if(!fs.existsSync(cardFilename)) {
        core.setFailed(`Cannot find file specified in ${process.env.GURU_CARD_YAML}: ${cardFilename}`);
        return;
      };
      const tmpfileBase=cardFilename.replace(/\.md$/gi,'').replace(/[^a-zA-Z0-9]/gi, '_');
      while(fs.existsSync(`${tmpCardsDir}/${tmpfileBase}.yaml`)) {
        tmpfileBase+=`_`;
      }
      console.log(`Writing ${cardFilename.replace(/\.md$/gi,'')} to ${tmpCardsDir}/${tmpfileBase}.yaml`);
      var mdcontent = fs.readFileSync(cardFilename);
      mdcontent += cardFooter.replace('__CARDPATH__',encodeURIComponent(cardFilename));
      if(process.env.GURU_CONVERT_MARKDOWN>0) {
        fs.writeFileSync(`${tmpCardsDir}/${tmpfileBase}.html`, markdownit.render(mdcontent));
      } else {
        if(process.env.GURU_WRAP_MARKDOWN>0) {
          // https://app.getguru.com/card/ceE6gnEi
          console.log("Wrap MD content in DIV as per app.getguru.com/card/ceE6gnEi");
          mdcontent = `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${encodeURIComponent(mdcontent)}"></div>`;
        }
        fs.writeFileSync(`${tmpCardsDir}/${tmpfileBase}.md`, mdcontent);
      }
      const cardConfig = cardConfigs[cardFilename];
      if (!cardConfig.ExternalId) {
        cardConfig.ExternalId = `${process.env.GITHUB_REPOSITORY}/${cardFilename}`
      }
      if (!cardConfig.ExternalUrl) {
        cardConfig.ExternalUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/master/${cardFilename}`
      }
      const cardYaml=yaml.stringify(cardConfig);
      fs.writeFileSync(`${tmpCardsDir}/${tmpfileBase}.yaml`, cardYaml);
    } catch (error) {
      core.setFailed(`Unable to prepare tempfiles: ${error.message}`);
      return;
    }
  } else {
    console.log(`Copying ${process.env.GURU_CARD_DIR} to ${tmpCardsDir}`);
    fs.copySync(process.env.GURU_CARD_DIR, tmpCardsDir);
    if (cardFooter) {
      const dir = fs.opendirSync(tmpCardsDir);
      let dirent
      while ((dirent = dir.readSync()) !== null) {
        if (dirent.name.endsWith('.md')||dirent.name.endsWith('.html')) {
          fs.appendFileSync(`${tmpCardsDir}/${dirent.name}`, cardFooter.replace('__CARDPATH__',encodeURIComponent(dirent.name)));
        }
      }
      dir.closeSync();
    }
  }
  if (process.env.GURU_RESOURCES_DIR) {
    console.log(`Updating relative links to files in GURU_RESOURCES_DIR "${process.env.GURU_RESOURCES_DIR}"`);
    let resources_dir=process.env.GURU_RESOURCES_DIR.replace(/\/+$/, '').replace(/^\/+/, '');
    resources_dir_split=resources_dir.split('/');
    const htmlLinkMatches = [];
    const mdLinkMatches = [];
    while(resources_dir_split.length) {
      resources_dir=resources_dir_split.join('/');
      htmlLinkMatches.push(new RegExp(`(<[^>]* (href|src)=("|'))(\\.\\.\\/)*${resources_dir}(\\/(.*)(\\3))`,'g'));
      mdLinkMatches.push(new RegExp(`(\\[(.*)\\]\\()(\\.\\.\\/)*${resources_dir}(\\/([^"')]+)(\\"(.+)\\")?\\))`,'g'));
      resources_dir_split.shift();
    }
    const dir = fs.opendirSync(tmpCardsDir);
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      if (dirent.name.endsWith('.md')||dirent.name.endsWith('.html')) {
        const olds = fs.readFileSync(`${tmpCardsDir}/${dirent.name}`, 'utf8');
        let news = `${olds}`;
        htmlLinkMatches.forEach(rx => news = news.replace(rx,'$1resources$5'));
        mdLinkMatches.forEach(rx => news = news.replace(rx,'$1resources$4'));
        if (olds!=news) {
          console.log(` - Updated ${tmpCardsDir}/${dirent.name}`);
          fs.writeFileSync(`${tmpCardsDir}/${dirent.name}`, news);
        }
      }
    }
    dir.closeSync();
  }
}

function copyBoardData(tmpBoardsDir, cardFileList) {
  console.log(`\n--- PROCESSING BOARD DATA---`);
  if (process.env.GURU_BOARD_YAML) {
    const boardConfigs = yaml.parse(fs.readFileSync(process.env.GURU_BOARD_YAML, 'utf8'));
    console.log(yaml.stringify(boardConfigs))
    for (let boardName in boardConfigs) {
      for (let item in boardConfigs[boardName]['Items']) {
        if(boardConfigs[boardName]['Items'][item].ID) {
          let cardYamlFile = boardConfigs[boardName]['Items'][item].ID+'.yaml';
          if (!cardFileList.includes(cardYamlFile)) {
            core.setFailed(`Error in board ${boardName}: cannot find ${cardYamlFile} in cards [${cardFileList}]`);
            return;
          }
        } else for (let section_item in boardConfigs[boardName]['Items'][item]['Items']) {
          let cardYamlFile = boardConfigs[boardName]['Items'][item]['Items'][section_item].ID+'.yaml';
          if (!cardFileList.includes(cardYamlFile)) {
            core.setFailed(`Error in board ${boardName}: cannot find ${cardYamlFile} in cards [${cardFileList}]`);
            return;
          }
        }
      }
      let boardNameSafe = boardName.replace(/[^a-zA-Z0-9]/gi, '_')
      let targetFile = `${tmpBoardsDir}/${boardNameSafe}.yaml`
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
    const boardGroupConfigs = yaml.parse(fs.readFileSync(process.env.GURU_BOARDGROUP_YAML, 'utf8'));
    console.log(yaml.stringify(boardGroupConfigs));
    for (let boardGroupName in boardGroupConfigs) {
      for (let item in boardGroupConfigs[boardGroupName]['Boards']) {
        let boardYamlFile = boardGroupConfigs[boardGroupName]['Boards'][item]+'.yaml';
        if (!boardFileList.includes(boardYamlFile)) {
          core.setFailed(`Error in boardgroup ${boardGroupName}: cannot find ${boardYamlFile} in cards [${boardFileList}]`);
          return;
        }
      }
      let boardGroupNameSafe = boardGroupName.replace(/[^a-zA-Z0-9]/gi, '_')
      const targetFile = `${tmpBoardGroupsDir}/${boardGroupNameSafe}.yaml`
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
  const tmpdir = tmp.dirSync();
  console.log('tmpdir: ', tmpdir.name);
  const tmpCardsDir = `${tmpdir.name}/cards`;
  fs.mkdirSync(tmpCardsDir);
  const tmpBoardsDir = `${tmpdir.name}/boards`;
  fs.mkdirSync(tmpBoardsDir);
  const tmpResourcesDir = `${tmpdir.name}/resources`;
  fs.mkdirSync(tmpResourcesDir);
  const tmpBoardGroupsDir = `${tmpdir.name}/board-groups`;
  fs.mkdirSync(tmpBoardGroupsDir);
  //populate card, board, boardgroup, collection, resources
  copyCardData(tmpCardsDir);
  const cardFileList = fs.readdirSync(tmpCardsDir, {withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.name);
  copyBoardData(tmpBoardsDir, cardFileList);
  const boardFileList = fs.readdirSync(tmpBoardsDir, {withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.name);
  copyBoardGroupData(tmpBoardGroupsDir, boardFileList);
  copyCollectionData(tmpdir.name, tmpCardsDir);
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
  } else if(process.env.GURU_CONVERT_MARKDOWN>0) {
    core.setFailed("GURU_CONVERT_MARKDOWN is only supported for EXTERNAL collections: https://developer.getguru.com/docs/guru-sync-manual-api");
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

