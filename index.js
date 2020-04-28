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

async function syncCollection(tmpdirname, auth, collectionId) {
  let options = {};
  options.cwd=tmpdirname;
  await exec.exec(`zip`, [`-r`,`guru_collection.zip`,`./`], options);
  if (process.env.DEBUG) {
    console.log(`DEBUG mode: not deploying ${tmpdirname}/guru_collection.zip to https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId}`);
  } else {
    await exec.exec(`curl -u ${auth.username}:${auth.password} https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId} -F "file=@${tmpdirname}/guru_collection.zip" -D -`);
  }
}

async function createCard(auth, collectionId, title, content) {
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

function copyCollectionData(tmpdir) {
  if (process.env.GURU_COLLECTION_YAML) {
    console.log(`Copying ${process.env.GURU_COLLECTION_YAML} to ${tmpdir.name}/collection.yaml`);
    fs.copySync(process.env.GURU_COLLECTION_YAML, `${tmpdir.name}/collection.yaml`);
  }
  else {
    console.log(fs.readFileSync(tmpdir.name, "utf8"));
    console.log(`Writing to ${tmpdir.name}/collection.yaml:`);
    fs.writeFileSync(`${tmpdir.name}/collection.yaml`, `--- ~\n`);
  }
}

try {
  let context = github.context;
  // console.log(context);
  let auth = {
    username: process.env.GURU_USER_EMAIL,
    password: process.env.GURU_USER_TOKEN
  };
  getCollection(
    auth,
    process.env.GURU_COLLECTION_ID
  ).then(response => {
    console.log(`Found ${response.data.collectionType} collection at https://app.getguru.com/collections/${response.data.slug}`);
    console.log(`${response.data.cards} cards, ${response.data.publicCards} publc`);
    if(process.env.GURU_CARD_DIR) {
      if(response.data.collectionType==`EXTERNAL`) {
        var tmpdir = tmp.dirSync();
        console.log('TmpDir: ', tmpdir.name);
        copyCollectionData(tmpdir);
        fs.mkdirSync(`${tmpdir.name}/cards`);
        fs.copySync(process.env.GURU_CARD_DIR, `${tmpdir.name}/cards`);
        syncCollection(tmpdir.name,auth,process.env.GURU_COLLECTION_ID).catch(error => {
          core.setFailed(`Unable to sync collection: ${error.message}`);
        });
      } else {
        core.setFailed("GURU_CARD_DIR is only supported for EXTERNAL collections: https://developer.getguru.com/docs/guru-sync-manual-api");
      }
    } else if(process.env.GURU_CARD_YAML) {
      let cardConfig = fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8');
      let cards = yaml.parse(cardConfig);
      console.log(cards)
      if(response.data.collectionType==`EXTERNAL`) {
        var tmpdir = tmp.dirSync();
        console.log('TmpDir: ', tmpdir.name);
        copyCollectionData(tmpdir);
        fs.mkdirSync(`${tmpdir.name}/cards`);
        for (let filename in cards) try {
          console.log(cards[filename].Title);
          let tmpfilename=filename.replace(/\.md$/gi,'').replace(/[^a-zA-Z0-9]/gi, '_');
          fs.copySync(filename,`${tmpdir.name}/cards/${tmpfilename}.md`);
          var cardYaml=yaml.stringify({
            'Title': `${cards[filename].Title}`,
            'ExternalId': `${process.env.GITHUB_REPOSITORY}/${filename}`,
            'ExternalUrl': `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/master/${filename}`
          })
          console.log(`Writing to ${tmpdir.name}/cards/${tmpfilename}.yaml:`);
          console.log(cardYaml);
          fs.writeFileSync(`${tmpdir.name}/cards/${tmpfilename}.yaml`, cardYaml);
        } catch (error) {
          core.setFailed(`Unable to prepare tempfiles: ${error.message}`);
        }
        syncCollection(tmpdir.name,auth,process.env.GURU_COLLECTION_ID).catch(error => {
          core.setFailed(`Unable to sync collection: ${error.message}`);
        });
      } else {
        for (let filename in cards) try {
          console.log(cards[filename].Title);
          createCard(
            auth,
            process.env.GURU_COLLECTION_ID,
            cards[filename].Title,
            fs.readFileSync(filename, "utf8")
          ).then(response => {
            console.log(`Created card for ${filename}`);
          }).catch(error => {
            core.setFailed(`Unable to create card for ${filename}: ${error.message}`);
          });
        } catch (error) {
          core.setFailed(`Unable to prepare card: ${error.message}`);
        }
      }
    } else {
      core.setFailed(`Specify either GURU_CARD_DIR or GURU_CARD_YAML`);
    }
  }).catch(error => {
    core.setFailed(`Unable to get collection info: ${error.message}`);
  });
} catch (error) {
  core.setFailed(error.message);
}

