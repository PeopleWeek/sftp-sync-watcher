#!/usr/bin/env node

const fs = require('file-system');
const {startImport} = require('./import/index.js');
const {startExport} = require('./export/index.js');

const [, , configFilePath, ...args] = process.argv;

const scheduleOptions = {
    'RUN_EVERY_MINUTE': '* * * * *',
    'RUN_EVERY_FIVE_MINUTES': '*/5 * * * *',
    'RUN_EVERY_FIFTEEN_MINUTES': '*/15 * * * *',
    'RUN_EVERY_HALF_AN_HOUR': '*/30 * * * *',
    'RUN_EVERY_HOUR': '0 * * * *',
    'RUN_EVERY_TWO_HOURS': '0 */2 * * *',
    'RUN_EVERY_DAY_AT_MIDNIGHT': '0 0 * * *'
};


const config = require(configFilePath);

Object.values(config).forEach(feature => {

    if(feature.import){
        const {scheduleTime, source, destination, importedFolder, filesToIgnore} = feature.import;
        const {sftp, variables} = feature;

        let sftpConfig = {
            ...sftp,
            privateKey: sftp.privateKeyPath ? fs.readFileSync(sftp.privateKeyPath) : null
        };
        delete sftpConfig.privateKeyPath;
        
        let ignoreFiles = filesToIgnore ? filesToIgnore : ['imported'];

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
        const {scheduleTime, source, destination, filesToIgnore} = feature.export;
        const {sftp, variables} = feature;

        let sftpConfig = {
            ...sftp,
            privateKey: sftp.privateKeyPath ? fs.readFileSync(sftp.privateKeyPath) : null
        };
        delete sftpConfig.privateKeyPath;
        
        startExport(
            scheduleTime ? scheduleTime : scheduleOptions.RUN_EVERY_FIFTEEN_MINUTES,
            source, 
            destination,
            sftpConfig,
            variables,
            filesToIgnore ? filesToIgnore : ['archived', 'deleted']
        );
    }
})