const axios = require('axios');
const core = require(`@actions/core`);
const github = require(`@actions/github`);

async function getCollection(auth, collectionId) {
  console.log('collection: ', collectionId)
  return axios.get('https://api.getguru.com/api/v1/collections/'+collectionId, {auth: auth})
}

async function createCard(auth, collectionId, title, content) {
  console.log('collection: ', collectionId)
  let headers = {
    auth: auth,
    'content-type': 'application/json'
  };
  let data = {
    preferredPhrase: title,
    content: content,
    htmlContent: false,
    collection: {'id': collectionId}
  }
  return axios.post('https://api.getguru.com/api/v1/facts/extended', data, headers)
}

try {
  let context = github.context;
  // console.log(context);
  let auth = {
    username: process.env.GURU_USER_EMAIL,
    password: process.env.GURU_USER_TOKEN
  };
  let nCreated = 0;
  getCollection(
    auth,
    process.env.GURU_COLLECTION_ID
  ).then(response => {
    console.log('collectionType: ', response.data.collectionType);
    console.log('slug: ', response.data.slug);
    console.log('cards: ', response.data.cards);
    console.log('publicCards: ', response.data.publicCards);
    if(response.data.collectionType=='EXTERNAL') {
      core.setFailed('Workflow for Synched Collections has not yet been implemented');
    } else {
      createCard(
        auth,
        process.env.GURU_COLLECTION_ID,
        'Test from GitHub-to-Guru action',
        'This is a test post from [GitHub to Guru](https://github.com/peckjon/github-to-guru)'
      ).then(response => {
        nCreated += 1;
        console.log(response);
      }).catch(error => {
        core.setFailed('Unable to get collection info: '+error.message);
      });
    }
  }).catch(error => {
    core.setFailed('Unable to get collection info: '+error.message);
  });
  core.setOutput(`created`, `${nCreated}`);
} catch (error) {
  core.setFailed(error.message);
}
