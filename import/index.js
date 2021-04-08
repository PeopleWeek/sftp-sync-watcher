var schedule = require('node-schedule');
const fs = require('file-system');
//const imported_files = require('./imported_files.json');

let Client = require('ssh2-sftp-client');
const sftp = require('ssh2-sftp-client');

const delay = (t) => {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(true);
        }, t);
    });
}

const getImportedFiles = () => {
    let rawdata = fs.readFileSync('./import/imported_files.json');
    return JSON.parse(rawdata);
}

const replaceVariablesInPath = (path, variables) => {
  let replacedPath = path;
  Object.keys(variables).forEach((key) => {
      replacedPath = path.split(key).join(variables[key]);
  })
  return replacedPath;
}

const addFileToImportedFiles = (file, destination, status) => {
    let imported_files = getImportedFiles();
    let importedFilesUpdated = {...imported_files};
    importedFilesUpdated[destination + '/' + file.name] = {
        successfully: status
    };

    fs.writeFile('./import/imported_files.json', 
        JSON.stringify(importedFilesUpdated), 
        (err) => {
          if (err) return console.log(err);
    });
}

const moveFile = (sftp, file, source, importedFolder) => {
    return sftp.rename(
        source + '/' + file.name, 
        importedFolder + '/' + file.name,
    ).then(res => {
        return sftp.end();
    })
    .catch(err => {
        console.error(err.message);
        return err;
    });
}

const downloadFile = async (sftp, file, source, destination, importedFolder) => {
    return sftp.exists(source + "/" + file.name)
    .then((exists) => {
        if(exists){
            if(!fs.existsSync(destination)){
                fs.mkdirSync(destination, { recursive: true });
            }
            return sftp.fastGet(
                source + '/' + file.name,
                destination + '/' + file.name
                );
        } else {
            return sftp.end();
        }
    })
    .then(async (res) => {
        if(res.includes('successfully')) {
            //addFileToImportedFiles(file, destination, true);
            if(importedFolder)
            {
                await delay(2000);
                await moveFile(sftp, file, source, importedFolder);
            }
        }
        else {
            //addFileToImportedFiles(file, destination, false);
        }
    })
    .catch(err => {
        //addFileToImportedFiles(file, destination, false);
        console.error(err.message);
    });
}

const downloadFiles = (async (sftp, files, source, destination, importedFolder) => {
    //files.forEach(async (file, index) => {
    for (const file of files) {
        await downloadFile(sftp, file, source, destination, importedFolder);
        // await delay(2000);
    };
});


exports.startImport = (async (scheduleTime, source, destination, importedFolder, sftpConfig, variables) => {
    schedule.scheduleJob(scheduleTime, async () => {
        const destinationPath = replaceVariablesInPath(destination, variables);
        let filesToDownload = [];
        
        let sftp = new Client();
        await sftp.connect(sftpConfig).then(() => {
          return sftp.exists(source);
        })
        .then((exists) => {
            if(exists){
                return sftp.list(source);
            } else {
                return sftp.end();
            }
        })
        .then((files) => {
            filesToDownload = files;
            if(!!filesToDownload && !!filesToDownload.length) {
                downloadFiles(sftp, filesToDownload, source, destinationPath, importedFolder);
            }
            return sftp.end();
        })
        .catch(err => {
            console.error(err.message);
        });

    });
});
