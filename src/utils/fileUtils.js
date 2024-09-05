const fs = require('fs').promises;
const path = require('path');

async function verifyUserImage(id) {
  const imagesPath = 'privateImages';
  
  try {
    const folders = await fs.readdir(imagesPath, { withFileTypes: true });
    
    for (const folder of folders) {
        if (!folder.isDirectory()) continue;
        
        const folderPath = path.join(imagesPath, folder.name);

        const fileToDelete = path.join(folderPath, `${folder.name}_${id}.jpeg`);
        const fileToRename = path.join(folderPath, `${folder.name}test_${id}.jpeg`);
        const newFileName = `${folder.name}_${id}.jpeg`;
    
        try {
          await fs.unlink(fileToDelete);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Errore durante l'eliminazione di ${fileToDelete}:`, err);
          }
        }
        try {
          await fs.rename(fileToRename, path.join(folderPath, newFileName));
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Errore durante la rinomina di ${fileToRename}:`, err);
          }
        }
    }
  } catch (err) {
    console.error('Errore nel processare le immagini:', err);
  }
}
module.exports = {verifyUserImage};