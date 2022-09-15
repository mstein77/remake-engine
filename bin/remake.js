#! /usr/bin/env node
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../');
dotenv.config({path: __dirname + '/.env'});

const enginePackage = '2dfireengine';
const packageJsonPath = './package.json';
const engineBasePath = './node_modules/' + enginePackage;

const IN = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    CYAN: '\x1b[36m',
    GRAY: '\x1b[90m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    WHITE: '\x1b[97m',
    NO_COL: '\x1b[0m'
};

function d(main, ...params) {
    let stack = null;
    try {
        throw new Error('myError');
    }
    catch(e) {
        stack = e.stack.split('\n');
    }
    const func = [];
    let no = 0;
    for (let line of stack) {
        const pos = no;
        no++;
        if (pos <= 1) {
            continue;
        } else if (pos === 2) {
            func.push(line.trim());
            continue;
        } else if (pos > 6) {
            break;
        }
        line = line.split('(');
        func.push(line[0].substr(6).trim());
    }
    console.group(IN.GRAY  + 'Debug ' + func.join(' <- ') + IN.NO_COL);
    console.log(main, ...params);
    console.groupEnd();
    return main;
}

function log( ...logArgs ) {
    let [ arg, ...args ] = logArgs;
    if (!arg) {
        console.log();
        return
    }
    if (typeof arg === 'string') {
        arg += IN.NO_COL
    }
    const newArgs = [ arg, ...args ];
    console.log( ...newArgs );
}


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
    log();
    log(IN.YELLOW + `Executing: ${IN.WHITE + cmd + IN.NO_COL}`);
    log();
    try {
        let stdout = execSync(cmd, {encoding: 'utf8', stdio: 'inherit'});
        return stdout !== null ? stdout.toString() : null;
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

try {
    if (!dirExists('.git')) {
        exec('git init');
    }
    if (!fileExists('./package.json')) {
        exec('npm init -y');
    }
    let packageJson = readJson(packageJsonPath);
    if (typeof packageJson !== 'object') throw Error(`Could not parse package.json!`);

    if (packageJson.name === enginePackage) throw Error('Cannot be executed in the engine package!');

    const hasPackage = (packageJson.dependencies !== undefined && packageJson.dependencies[enginePackage] !== undefined);
    if (!hasPackage) {
        exec('npm install git+https://' + process.env.PAT + '@github.com/mstein77/2DFireEngine.git\\#feature/engineBuild');
        packageJson = readJson(packageJsonPath)
    }
    const hasScript = (packageJson.scripts !== undefined && packageJson.scripts.game !== undefined);
    if (!hasScript) {
        if (packageJson.scripts === undefined) {
            packageJson.scripts = {};
        }
        packageJson.scripts.game = 'npm run build-game-dev --prefix ' + engineBasePath;
        if (packageJson.type === undefined) {
            packageJson.type = 'module';
        }
        packageJson.scripts.build = "npm run build-game-prod --prefix " + engineBasePath;
        writeJson(packageJsonPath, packageJson);
        packageJson = readJson(packageJsonPath);
    }

    let baseConfig = {
        title: 'Remake Engine Game V0.1',
        browsers: '>2.25%, not ie 11, not op_mini all',
        editor: true,
        touch: true,
        gzip: true,
        minimize: false,
        server: true,
        baseUrl: 'http://localhost:8080',
        sourceMaps: true,
        sourceMapType: 'eval-cheap-source-map',
        envPrefix: 'RMK_',
        port: 8080,
        dist: {
            editor: false,
            minimize: true,
            sourceMaps: false
        }
    };
    addMissingDirsAndFiles({
        resources: {
            json: {},
            image: {},
            audio: {}
        },
        src: {
            'index.js': [
                'import { Game } from "' + enginePackage + '";',
                '// your game starts here...',
                'console.log(\'Let the games begin...\')',
            ].join("\n"),
            screens: {}
        },
        dist: {},
        '.gitignore': ["dist/", "node_modules/", ".env"].join("\n"),
        'config.cjs': "module.exports = " + JSON.stringify(baseConfig, null, 2)
    });

    // trigger install of engine dependencies
    if (!dirExists( + engineBasePath + '/node_modules')) {
        exec('npm install --prefix=' + engineBasePath);
    }

    process.exit(0)
} catch (err) {
    console.error(err);
    process.exit(1)
}