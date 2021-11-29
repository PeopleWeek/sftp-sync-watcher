var schedule = require('node-schedule');
const fs = require('file-system');
const path = require('path');

let Client = require('ssh2-sftp-client');


const replaceVariablesInPath = (path, variables) => {
    let replacedPath = path;
    Object.keys(variables).forEach((key) => {
        replacedPath = path.split(key).join(variables[key]);
    })
    return replacedPath;
}

const uploadFiles = (files, destination, sftpConfig) => {
    let sftp = new Client();
    
    sftp.connect(sftpConfig).then(() => {
        return sftp.exists(destination);
    })
    .then((exists) => {
        if(exists){
            return Promise.all(files.map(file => {
                const localFile = fs.createReadStream(file);
                const remoteFile = destination + "/" +  path.basename(file);
                return sftp.put(localFile, remoteFile);
              }));
        } else {
            return sftp.end();
        }
    })
    .then((result) => {
        if(result.includes('Uploaded data stream') || result[0].includes('Uploaded data stream')){
            files.forEach((file) => {
                const archivePath = path.dirname(file) + '/archived';
                if(!fs.existsSync(archivePath)){
                    fs.mkdirSync(archivePath);
                }
                fs.renameSync(file, archivePath + "/" + path.basename(file));
            });
        }
        return sftp.end();
    })
    .catch(err => {
        console.error(err.message);
    });
}


exports.startExport = (source, destination, sftpConfig, variables, ignoreFiles) => {
    schedule.scheduleJob('*/2 * * * *', async () => {
        let path = null;
        if(Array.isArray(source)){
            path = source.map(s => {
                const resultPath = replaceVariablesInPath(s, variables);
                if(!fs.existsSync(resultPath)){
                    fs.mkdirSync(resultPath, { recursive: true });
                }
                return resultPath;
            });
        } else {
            path = replaceVariablesInPath(source, variables);
            if(!fs.existsSync(path)){
                fs.mkdirSync(path, { recursive: true });
            }
            path = [path];
        }

        files = [];
        path.forEach((p) => {
            fs.readdirSync(p).forEach(file => {
                if(!ignoreFiles.includes(file.toLowerCase())) {
                    files.push(p + '/' + file);
                }
            });
        })
        if(files && files.length) {
            uploadFiles(files, destination, sftpConfig);
        }
        
    });
}