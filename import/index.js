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


const replaceVariablesInPath = (path, variables) => {
  let replacedPath = path;
  Object.keys(variables).forEach((key) => {
      replacedPath = path.split(key).join(variables[key]);
  })
  return replacedPath;
}


// const moveFile = (file, source, importedFolder, sftpConfig) => {
//     let sftp = new Client();
//     return sftp.connect(sftpConfig).then(() => {
//         return sftp.rename(
//             source + '/' + file.name, 
//             importedFolder + '/' + file.name,
//         );
//     })
//     .then(res => {
//         return sftp.end();
//     })
//     .catch(err => {
//         console.error(err.message);
//         return err;
//     });
// }

// const downloadFile = async (file, source, destination, importedFolder, sftpConfig) => {
//     let sftp = new Client();

//     return sftp.connect(sftpConfig).then(() => {
//         return sftp.exists(source + "/" + file.name);
//     })
//     .then((exists) => {
//         if(exists){
//             if(!fs.existsSync(destination)){
//                 fs.mkdirSync(destination, { recursive: true });
//             }
//             return sftp.fastGet(
//                 source + '/' + file.name,
//                 destination + '/' + file.name
//                 );
//         } else {
//             return sftp.end();
//         }
//     })
//     .then(async (res) => {
//         if(res.includes('successfully')) {
//             //addFileToImportedFiles(file, destination, true);
//             if(importedFolder)
//             {
//                 await delay(2000);
//                 await moveFile(file, source, importedFolder, sftpConfig);
//             }
//         }
//         else {
//             //addFileToImportedFiles(file, destination, false);
//         }
//         return sftp.end();
//     })
//     .catch(err => {
//         //addFileToImportedFiles(file, destination, false);
//         console.error(err.message);
//     });
// }

// const downloadFiles = (async (files, source, destination, importedFolder, sftpConfig, ignoreFiles) => {
//     //files.forEach(async (file, index) => {
//     for (const file of files) {
//         if(!ignoreFiles.includes(file.name)) {
//             await downloadFile(file, source, destination, importedFolder, sftpConfig);
//             await delay(2000);
//         }
//     };
// });


const downloadAll = (async (files, source, destination, importedFolder, sftpConfig, ignoreFiles) => {
    let sftp = new Client();
    
    if(!fs.existsSync(destination)){
        fs.mkdirSync(destination, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        sftp.connect(sftpConfig).then(()=>{
            return Promise.all(files.map(file => {
                return sftp.fastGet(
                    source + '/' + file.name,
                    destination + '/' + file.name
                    );
              }));
        })
        .then(()=>{
            return Promise.all(files.map(file => {
                return sftp.rename(
                    source + '/' + file.name, 
                    importedFolder + '/' + file.name,
                );
            }));
        })
        .then(()=>sftp.end())
        .then(resolve)
        .catch(reject)
    });
});


exports.startImport = (async (scheduleTime, source, destination, importedFolder, sftpConfig, variables, ignoreFiles) => {
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
            filesToDownload = files && files.length ? files.filter(f => !ignoreFiles.includes(f.name) && f.type !== 'd') : [];
            return sftp.end();
        })
        .catch(err => {
            console.error(err.message);
        });

        if(!!filesToDownload && !!filesToDownload.length) {
            downloadAll(filesToDownload, source, destinationPath, importedFolder, sftpConfig, ignoreFiles);
        }
    });
});
