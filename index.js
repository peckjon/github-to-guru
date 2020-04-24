const axios = require(`axios`);
const cpfile = require(`cp-file`);
const fs = require(`fs`);
const tmp = require(`tmp`);
const write = require(`write`);
const yaml = require('yaml')
const core = require(`@actions/core`);
const exec = require('@actions/exec');
const github = require(`@actions/github`);

async function makeDir(path) {
  await fs.mkdir(path);
}

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
  let nCreated = 0;
  core.setOutput(`created`, `${nCreated}`);
  getCollection(
    auth,
    process.env.GURU_COLLECTION_ID
  ).then(response => {
    console.log(`collectionType:`, response.data.collectionType);
    console.log(`slug:`, response.data.slug);
    console.log(`cards:`, response.data.cards);
    console.log(`publicCards:`, response.data.publicCards);
    let configFile = fs.readFileSync(process.env.GURU_CARD_YAML, 'utf8');
    let files = yaml.parse(configFile);
    console.log(files)
    if(response.data.collectionType==`EXTERNAL`) {
      var tmpdir = tmp.dirSync();
      console.log('Dir: ', tmpdir.name);
      var collectionYaml=`--- ~
`
      write.sync(`${tmpdir.name}/collection.yaml`, collectionYaml);
      makeDir(`${tmpdir.name}/cards`);
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
        write.sync(`${tmpdir.name}/cards/${tmpfilename}.yaml`, cardYaml); 
        console.log(`  id: ${response.data.id}`);
        console.log(`  slug: ${response.data.slug}`);
        nCreated += 1;
        core.setOutput(`created`, `${nCreated}`);
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
          console.log(`  id: ${response.data.id}`);
          console.log(`  slug: ${response.data.slug}`);
          nCreated += 1;
          core.setOutput(`created`, `${nCreated}`);
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
