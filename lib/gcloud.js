import exec from './exec.js';

class Gcloud {
  constructor() {
    this.configGroup = 'core';
  }

  setGkeContext(config) {
    return exec(`gcloud container clusters get-credentials ${config.cluster} \
      --zone=${config.zone} \
      --project=${config.project}`);
  }

  async getConfig() {
    let {stdout} = await exec(`gcloud config list --format=json`);
    return JSON.parse(stdout)[this.configGroup];
  }

  async setProject(project) {
    await exec(`gcloud config set project ${project}`);
  }

  async getSecret(name) {
    let {stdout} = await exec(`gcloud secrets versions access latest --secret=${name}`);
    return stdout.trim();
  }
}

const inst = new Gcloud();
export default inst;