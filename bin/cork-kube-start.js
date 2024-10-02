import { Command } from 'commander';
import init from '../lib/init-env.js';
import config from '../lib/config.js';
import deploy from '../lib/deploy.js';
import kubectl from '../lib/kubectl.js';

const program = new Command();

program
  .argument('<env>', 'environment to start')
  .option('-c, --config <config>', 'path to config file')
  .option('-p, --project <project>', 'project name')
  .option('-s, --service <name>', 'only deploy a specific service')
  .option('-g, --group <name>', 'only deploy a specific group of services')
  .option('-r, --redeploy', 'redeploy service, deletes it first then deploys. A service must be specified')
  .option('-d, --debug', 'debug service deployment')
  .action(async (env, opts) => {
    if( opts.service && opts.group ) {
      console.error('Cannot specify both service and group, please choose one');
      process.exit(1);
    }

    await init(env, opts);

    let envConfig = config.data.local.environments[env];
    let namespaces = await kubectl.getNamespaces();
    if( !namespaces.includes(envConfig.namespace) ) {
      console.log(`Creating namespace ${envConfig.namespace}`);
      if( !opts.debug ) {
        await kubectl.createNamespace(envConfig.namespace);
      }
    }

    if( config.data.local.secrets && !opts.service && !opts.group ) {
      await deploy.secrets(env, opts);
    }

    let groupServices = [];
    if( opts.group ) {
      for( let service of config.data.local.services ) {
        groupServices.push(await deploy.renderTemplate(service.name, env, {quiet: true}));
      }

      groupServices = groupServices
        .filter(s => s.group.includes(opts.group));
    }

    if( opts.redeploy && !opts.debug) {
      if( !opts.service && !opts.group ) {
        console.error('Service name or group is required for redeploy');
        process.exit(1);
      }

      if( opts.group ) {
        for( let service of groupServices ) {
          try {
            await deploy.remove(service.name, env);
          } catch(e) {
            console.warn(e.message);
          }
        }
      } else {
        try {
          await deploy.remove(opts.service, env);
        } catch(e) {
          console.warn(e.message);
        }
      }
    }

    if( opts.group ) {
      for( let service of groupServices ) {
        await deploy.service(service.name, env, opts.debug);
      }
    } else if( opts.service ) {
      await deploy.service(opts.service, env, opts.debug);
    } else {
      await deploy.all(env, opts.debug);
    }
  });

program.parse(process.argv);