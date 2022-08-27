#! /usr/bin/env node
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../');
dotenv.config({path: __dirname + '/.env'});

// Check if the file exists in the current directory.

function fileExists(path) {
    try {
        const stat = fs.statSync('./package.json');
        if (!stat.isFile()) return false;
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
    const data = JSON.stringify(json);
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

const enginePackage = '2dfireengine';
const packageJsonPath = './package.json';

try {
    if (!fileExists('./package.json')) {
        const out =  exec('npm init -y');
        console.log(out);
    }
    let packageJson = readJson(packageJsonPath);
    if (typeof packageJson !== 'object') throw Error(`Could not parse package.json!`);

    if (packageJson.name === enginePackage) throw Error('Cannot be executed in the engine package!');

    const hasPackage = (packageJson.dependencies !== undefined && packageJson.dependencies[enginePackage] !== undefined);
    if (!hasPackage) {
        const out = exec('npm install git+https://' + process.env.PAT + '@github.com/mstein77/2DFireEngine.git\\#feature/deployment');
        console.log(out);
        packageJson = readJson(packageJsonPath)
    }
    const hasScript = (packageJson.scripts !== undefined && packageJson.scripts.game !== undefined);
    if (!hasScript) {
        if (packageJson.scripts === undefined) {
            packageJson.scripts = {};
        }
        packageJson.scripts.game = 'echo "Running..."';
        writeJson(packageJsonPath, packageJson);
        packageJson = readJson(packageJsonPath);
    }

    // TODO: setup directory structure

    console.log(packageJson);
    process.exit(0)
} catch (err) {
    console.error(err);
    process.exit(1)
}