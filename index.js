const axios = require(`axios`);
const cpfile = require(`cp-file`);
const child_process = require(`child_process`);
const fs = require(`fs`);
const tmp = require(`tmp`);
const write = require(`write`);
const core = require(`@actions/core`);
const exec = require('@actions/exec');
const github = require(`@actions/github`);

async function getCollection(auth, collectionId) {
  console.log(`collection: ${collectionId}`)
  return axios.get(`https://api.getguru.com/api/v1/collections/`+collectionId, {auth: auth})
}

async function syncCollection(tmpdirname, auth, collectionId) {
  await exec.exec(`zip -r -j guru_collection.zip ${tmpdirname}`);
  await exec.exec(`curl -u ${auth.username}:${auth.password} https://api.getguru.com/app/contentsyncupload?collectionId=${collectionId} -F "file=@guru_collection.zip" -D -`);
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
    if(response.data.collectionType==`EXTERNAL`) {
      console.log(process.env.FILE_LIST)
      let files = JSON.parse(process.env.FILE_LIST);
      var tmpdir = tmp.dirSync();
      console.log('Dir: ', tmpdir.name);
      for (let filename in files) try {
        console.log(files[filename]);
        let tmpfilename=filename.replace(/\.md$/gi,'').replace(/[^a-zA-Z0-9]/gi, '_');
        cpfile.sync(filename,`${tmpdir.name}/${tmpfilename}.md`);
        var yaml=`Title: ${files[filename]}
ExternalId: ${process.env.GITHUB_REPOSITORY}/${filename}
ExternalUrl: https://github.com/${process.env.GITHUB_REPOSITORY}/blob/master/${filename}
`
        write.sync(`${tmpdir.name}/${tmpfilename}.yaml`, yaml); 
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
      console.log(process.env.FILE_LIST)
      let files = JSON.parse(process.env.FILE_LIST);
      for (let filename in files) try {
        console.log(files[filename]);
        createCard(
          auth,
          process.env.GURU_COLLECTION_ID,
          files[filename],
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
