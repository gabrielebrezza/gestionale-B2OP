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

async function getNextFileNumber(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    const jpgFiles = files.filter(file => path.extname(file).toLowerCase() === '.jpg');
    const numbers = jpgFiles.map(file => parseInt(path.basename(file, '.jpg'))).filter(num => !isNaN(num));

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch (error) {
    console.error('Errore nel leggere i file della cartella:', error);
    return 1;
  }
}
async function resetImageNumbering(folderPath) {
  try {
      const files = await fs.readdir(folderPath);
      const jpgFiles = files.filter(file => path.extname(file).toLowerCase() === '.jpg');
      const sortedFiles = jpgFiles.sort((a, b) => parseInt(path.basename(a, '.jpg')) - parseInt(path.basename(b, '.jpg')));

      for (let i = 0; i < sortedFiles.length; i++) {
          const oldFilePath = path.join(folderPath, sortedFiles[i]);
          const newFilePath = path.join(folderPath, `${i + 1}.jpg`);

          if (oldFilePath !== newFilePath) {
              await fs.rename(oldFilePath, newFilePath);
          }
      }
  } catch (error) {
      console.error('Errore durante la rinumerazione delle immagini:', error);
      throw error;
  }
}

module.exports = {verifyUserImage, getNextFileNumber, resetImageNumbering};