import fse from 'fs-extra';
import { listPublicWorkspaces, currentSHA } from './workspaces.js';

/**
 * This is an I/O heavy way to do this, but hopefully it reads easy
 *
 * these functions change the CWD as they go, returnning to he previous
 * CWD via finally blocks upon finish.
 */
async function updateVersions() {
  let sha = await currentSHA();

  let publicWorkspaces = await listPublicWorkspaces();

  // Pick new versions for each package
  for (let workspace of publicWorkspaces) {
    console.info(`Setting version of ${workspace}`);
    await setVersion(sha, workspace);
  }

  // Update each dependency to use the new versions
  for (let workspace of publicWorkspaces) {
    console.info(`Updating dependencies of ${workspace}`);
    await updateDependencies(workspace);
  }
}

updateVersions();

////////////////////////////////////////////

const NEW_VERSIONS = {};

async function setVersion(sha, filePath) {
  let json = await fse.readJSON(filePath);
  json.version = `${json.version}-unstable.${sha}`;

  NEW_VERSIONS[json.name] = json.version;

  await fse.writeJSON(filePath, json, { spaces: 2 });
}

async function updateDependencies(filePath) {
  let json = await fse.readJSON(filePath);

  for (let [dep, version] of Object.entries(NEW_VERSIONS)) {
    if ((json.dependencies || {})[dep]) {
      json.dependencies[dep] = version;
    }

    if ((json.devDependencies || {})[dep]) {
      json.devDependencies[dep] = version;
    }

    if ((json.peerDependencies || {})[dep]) {
      json.peerDependencies[dep] = version;
    }
  }

  await fse.writeJSON(filePath, json, { spaces: 2 });
}
