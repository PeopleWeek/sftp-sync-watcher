var schedule = require('node-schedule');
const fs = require('file-system');
//const imported_files = require('./imported_files.json');

let Client = require('ssh2-sftp-client');

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

const downloadFiles = (files, source, destination, sftpConfig) => {
    files.forEach(file => {
          let sftp = new Client();

          sftp.connect(sftpConfig).then(() => {
            return sftp.exists(source + "/" + file.name);
          })
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
          .then((res) => {
              if(res.includes('successfully')) {
                addFileToImportedFiles(file, destination, true);
              }
              else {
                addFileToImportedFiles(file, destination, false);
              }
              return sftp.end();
          })
          .catch(err => {
              addFileToImportedFiles(file, destination, false);
              console.error(err.message);
          });
    });
}


exports.startImport = (scheduleTime, source, destination, sftpConfig, variables) => {
    const destinationPath = replaceVariablesInPath(destination, variables);
    schedule.scheduleJob(scheduleTime, () => {

        let sftp = new Client();
        sftp.connect(sftpConfig).then(() => {
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
            let imported_files = getImportedFiles();
            if(!!files && !!files.length) {
                let filesToDownload = files.filter(file => {
                    const key = destinationPath + '/' + file.name;
                    return !imported_files.hasOwnProperty(key) 
                          || !imported_files[key].successfully;
                })
                if(!!filesToDownload && !!filesToDownload.length){
                    downloadFiles(filesToDownload, source, destinationPath, sftpConfig);
                }
            }
            return sftp.end();
        })
        .catch(err => {
            console.error(err.message);
        });
    });
}
