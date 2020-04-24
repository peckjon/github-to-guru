const axios = require(`axios`);
const cpfile = require(`cp-file`);
const fs = require(`fs`);
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
  await exec.exec(`curl -u ${auth.username}:${auth.password} https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId} -F "file=@${tmpdirname}/guru_collection.zip" -D -`);
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
    let configFile = fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8');
    //TBD: if (process.env.GURU_CARD_YAML) vs GURU_CARD_DIR
    if(process.env.GURU_CARD_DIR) {
      core.setFailed("Hold tight! GURU_CARD_DIR support is being added within 48h");
    }
    let files = yaml.parse(configFile);
    console.log(files)
    if(response.data.collectionType==`EXTERNAL`) {
      var tmpdir = tmp.dirSync();
      console.log('TmpDir: ', tmpdir.name);
      if (process.env.GURU_COLLECTION_YAML) {
        cpfile.sync(process.env.GURU_COLLECTION_YAML,`${tmpdir.name}/collection.yaml`);
      } else {
        fs.writeFileSync(`${tmpdir.name}/collection.yaml`, `--- ~\n`);
      }
      fs.mkdirSync(`${tmpdir.name}/cards`);
      for (let filename in files) try {
        console.log(files[filename].Title);
        let tmpfilename=filename.replace(/\.md$/gi,'').replace(/[^a-zA-Z0-9]/gi, '_');
        cpfile.sync(filename,`${tmpdir.name}/cards/${tmpfilename}.md`);
        var cardYaml=`---
Title: "${files[filename].Title}"
ExternalId: "${process.env.GITHUB_REPOSITORY}/${filename}"
ExternalUrl: "https://github.com/${process.env.GITHUB_REPOSITORY}/blob/master/${filename}"
`
        console.log(cardYaml);
        fs.writeFileSync(`${tmpdir.name}/cards/${tmpfilename}.yaml`, cardYaml);
      } catch (error) {
        core.setFailed(`Unable to prepare tempfiles: ${error.message}`);
      }
      syncCollection(tmpdir.name,auth,process.env.GURU_COLLECTION_ID).catch(error => {
        core.setFailed(`Unable to sync collection: ${error.message}`);
      });
    } else {
      for (let filename in files) try {
        console.log(files[filename].Title);
        createCard(
          auth,
          process.env.GURU_COLLECTION_ID,
          files[filename].Title,
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
  }).catch(error => {
    core.setFailed(`Unable to get collection info: ${error.message}`);
  });
} catch (error) {
  core.setFailed(error.message);
}
