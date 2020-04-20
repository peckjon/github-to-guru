const axios = require('axios');
const core = require(`@actions/core`);
const github = require(`@actions/github`);

async function getCollection(auth, id) {
  return axios.get('https://api.getguru.com/api/v1/collections/'+id, {auth: auth})
}

try {
  let context = github.context;
  console.log(context);
  let auth = {
    username: process.env.GURU_USER_EMAIL,
    password: process.env.GURU_USER_TOKEN
  };
  getCollection(
    auth,
    process.env.GURU_COLLECTION_ID
  ).then(response => {
    console.log('collectionType: ', response.data.collectionType);
  }).catch(error => {
    core.setFailed('Unable to get collection info: '+error.message);
  });
  let nCreated = 0;
  core.setOutput(`created`, `${nCreated}`);
} catch (error) {
  core.setFailed(error.message);
}
