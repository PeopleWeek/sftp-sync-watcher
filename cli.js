#!/usr/bin/env node

const fs = require('file-system');
const {startImport} = require('./import/index.js');
const {startExport} = require('./export/index.js');

const [, , configFilePath, ...args] = process.argv;

const scheduleOptions = {
    'RUN_EVERY_MINUTE': '* * * * *',
    'RUN_EVERY_HOUR': '0 * * * *',
    'RUN_EVERY_TWO_HOURS': '0 */2 * * *',
    'RUN_EVERY_DAY_AT_MIDNIGHT': '0 0 * * *'
};


const config = require(configFilePath);

Object.values(config).forEach(feature => {

    if(feature.import){
        const {scheduleTime, source, destination, importedFolder} = feature.import;
        const {sftp, variables, filesToIgnore} = feature;

        let sftpConfig = {
            ...sftp,
            privateKey: sftp.privateKeyPath ? fs.readFileSync(sftp.privateKeyPath) : null
        };
        delete sftpConfig.privateKeyPath;
        
        let ignoreFiles = filesToIgnore ? filesToIgnore : [];

        startImport(
            scheduleOptions.hasOwnProperty(scheduleTime) ? scheduleOptions[scheduleTime] : scheduleTime, 
            source, 
            destination,
            importedFolder,
            sftpConfig, 
            variables,
            ignoreFiles
        );
    }
    
    if(feature.export){
        const {source, destination} = feature.export;
        const {sftp, variables} = feature;

        let sftpConfig = {
            ...sftp,
            privateKey: fs.readFileSync(sftp.privateKeyPath)
        };
        delete sftpConfig.privateKeyPath;
        
        startExport(
            source, 
            destination,
            sftpConfig,
            variables
        );
    }
})