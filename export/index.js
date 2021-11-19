const chokidar = require('chokidar');
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

const fileIsAdded = (filePath, destination, sftpConfig) => {

    let sftp = new Client();
    
    sftp.connect(sftpConfig).then(() => {
        return sftp.exists(destination);
    })
    .then((exists) => {
        if(exists){
            const localFile = fs.createReadStream(filePath);
            const remoteFile = destination + "/" +  path.basename(filePath);

            return sftp.put(localFile, remoteFile);
        } else {
            return sftp.end();
        }
    })
    .then((result) => {
        if(result.includes('Uploaded data stream')){
            const archivePath = path.dirname(filePath) + '/archived';
            if(!fs.existsSync(archivePath)){
                fs.mkdirSync(archivePath);
            }
            fs.renameSync(filePath, archivePath + "/" + path.basename(filePath))
        }
        return sftp.end();
    })
    .catch(err => {
        console.error(err.message);
    });
}

exports.startExport = (source, destination, sftpConfig, variables) => {
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
    }
    

    const watcher = chokidar.watch(path, {
        ignored: /archived/,
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: true,
        followSymlinks: false,
        depth: 0
    });

    watcher
        .on('add', filePath => fileIsAdded(filePath, destination, sftpConfig));
}