const core = require(`@actions/core`);
const github = require(`@actions/github`);

try {
  let context = github.context
  console.log(`GURU_API_KEY`, process.env.GURU_API_KEY)
  console.log(context);
  let nCreated = 0;
  core.setOutput(`created`, `${nCreated}`);
} catch (error) {
  core.setFailed(error.message);
}
