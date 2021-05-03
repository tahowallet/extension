/*

this file is executed from project root as a yarn script
in package.json

*/

const fs = require('fs')


const PLATFORM_BUILD = process.env.PLATFORM_BUILD
const platformSpecifics = require(`../src/extension/manifest/${PLATFORM_BUILD}.json`)
const base = require('../src/extension/manifest/base.json')


const finalManifest = {...base, ...platformSpecifics}




fs.writeFile(`dist/${PLATFORM_BUILD}/manifest.json`, JSON.stringify(finalManifest), (err) => {
    if (err) {
        throw err;
    }
    console.log(`${PLATFORM_BUILD} write to manifest sucess!`);
});