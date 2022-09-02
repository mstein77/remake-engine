#! /usr/bin/env node
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../');
dotenv.config({path: __dirname + '/.env'});

const pairs = Object.entries;

function fileExists(path) {
    try {
        const stat = fs.statSync(path);
        if (!stat.isFile()) return false;
        return true
    } catch (err) {
        return false
    }
}

function dirExists(path) {
    try {
        const stat = fs.statSync(path);
        if (!stat.isDirectory()) return false;
        return true
    } catch (err) {
        return false
    }
}

function readJson(path) {
    if (!fileExists(path)) throw Error(`File not found: ${path}`);
    const rawdata = fs.readFileSync(path);
    const json = JSON.parse(rawdata);
    return json
}

function writeJson(path, json) {
    const data = JSON.stringify(json, undefined, 4);
    fs.writeFileSync(path, data);
}

function exec(cmd, expectedStatus = 0) {
    console.log('Executing: ' + cmd);
    try {
        let stdout = execSync(cmd, {encoding: 'utf8'});
        return stdout.toString();
    } catch (err) {
        if (err.status === expectedStatus) {
            return err.stdout;
        }
        console.error(err);
        throw err;
    }
}

function addMissingDirsAndFiles(missing, path = './') {
    for (let [name, content] of pairs(missing)) {
        const itemPath = path + name;
        switch (typeof content) {
            case 'string':
                if (!fileExists(itemPath)) {
                    fs.writeFileSync(itemPath, content)
                }
                break;

            case 'object':
                if (!dirExists(itemPath)) {
                    fs.mkdirSync(itemPath)
                }
                addMissingDirsAndFiles(missing[name], itemPath + '/');
                break;
        }
    }
}

const enginePackage = '2dfireengine';
const packageJsonPath = './package.json';
const engineBasePath = './node_modules/' + enginePackage;

try {
    if (!dirExists('.git')) {
        exec('git init');
    }
    if (!fileExists('./package.json')) {
        const out =  exec('npm init -y');
        console.log(out);
    }
    let packageJson = readJson(packageJsonPath);
    if (typeof packageJson !== 'object') throw Error(`Could not parse package.json!`);

    if (packageJson.name === enginePackage) throw Error('Cannot be executed in the engine package!');

    const hasPackage = (packageJson.dependencies !== undefined && packageJson.dependencies[enginePackage] !== undefined);
    if (!hasPackage) {
        const out = exec('npm install git+https://' + process.env.PAT + '@github.com/mstein77/2DFireEngine.git\\#feature/engineBuild');
        console.log(out);
        packageJson = readJson(packageJsonPath)
    }
    const hasScript = (packageJson.scripts !== undefined && packageJson.scripts.game !== undefined);
    if (!hasScript) {
        if (packageJson.scripts === undefined) {
            packageJson.scripts = {};
        }
        packageJson.scripts.game = 'npm run build-game --prefix ' + engineBasePath;
        if (packageJson.type === undefined) {
            packageJson.type = 'module';
        }
        writeJson(packageJsonPath, packageJson);
        packageJson = readJson(packageJsonPath);
    }
    let baseConfig = {
        browsers: '>2.25%, not ie 11, not op_mini all',
        editor: true,
        touch: true,
        gzip: true,
        port: 8080
    };
    addMissingDirsAndFiles({
        resources: {
            json: {},
            image: {},
            audio: {}
        },
        src: {
            'index.js': [
                'import * as config from "../config.js";',
                '// your game starts here...',
                'console.log(\'Let the games begin...\')',
                'console.log(config);'
            ].join("\n"),
            screens: {}
        },
        dist: {},
        '.gitignore': ["dist/", "node_modules/", ".env"].join("\n"),
        'config.cjs': "module.exports = " + JSON.stringify(baseConfig, null, 2)
    });

    // trigger install of engine dependencies
    if (!dirExists( + engineBasePath + '/node_modules')) {
        console.log(exec('npm install --prefix=' + engineBasePath));
    }

    if (!fileExists(engineBasePath + '/dist-engine/engine.js')) {
        console.log(exec('npm run build-engine --prefix=' + engineBasePath));
    }

    process.exit(0)
} catch (err) {
    console.error(err);
    process.exit(1)
}