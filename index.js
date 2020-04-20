const core = require(`@actions/core`);
const github = require(`@actions/github`);

try {
  let context = github.context
  console.log(`GURU_USER_EMAIL`, process.env.GURU_USER_EMAIL)
  console.log(`GURU_USER_TOKEN`, process.env.GURU_USER_TOKEN)
  console.log(context);
  let nCreated = 0;
  core.setOutput(`created`, `${nCreated}`);
} catch (error) {
  core.setFailed(error.message);
}
