/**************************************
 * To find unused assets in your Project you can use this script
 * 
 * update the path to ASSETS_DIR (assets folder location), PROJECT_DIR, CONSTANTS_FILE_PATH(if you are exporting your assets from constants file use this)
 * Update the image extensions to be search under IMAGE_EXTENSIONS constans
 * 
 * To run the script just type on terminal - node CheckUnusedAssets.js
 * The output will be pushed to file unused_assets.txt

***************************************/

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = './src/assets'; // Change to your assets directory
const PROJECT_DIR = './src'; // Change to your source code directory
const CONSTANTS_FILE_PATH = path.join(PROJECT_DIR, '/constants/images.js'); // Path to your constants file

// Define constants for file extensions and size conversion
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|svg|gif|mp4)$/;
const HIGH_RESOLUTION_SUFFIXES = /@[23]x\./;
const SIZE_CONVERSION_FACTOR = 1024 * 1024; // Bytes to MB conversion factor

// Get all asset filenames, including those in subdirectories
const getAssets = (dir, baseDir) => {
    let assetFiles = [];

    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(baseDir, fullPath); // Calculate relative path
        if (fs.lstatSync(fullPath).isDirectory()) {
            // Recursively get assets from subdirectories
            assetFiles = assetFiles.concat(getAssets(fullPath, baseDir));
        } else if (IMAGE_EXTENSIONS.test(file)) {
            assetFiles.push(relativePath);
        }
    });
    return assetFiles;
};

// Read specific images from the constants file
const readConstantsFile = () => {
    if (fs.existsSync(CONSTANTS_FILE_PATH)) {
        const content = fs.readFileSync(CONSTANTS_FILE_PATH, 'utf8');
        // Extract image references; assuming they are defined as 'const imageName = require("./path/to/image.png");'
        const regex = /require\(["'](.+?)["']\)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]); // Extract the path
        }
        return new Set(matches); // Return as a Set for easy lookup
    }
    return new Set();
};

// Get all file contents in project directory
const getFilesContent = (dir) => {
    let filesContent = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            filesContent = filesContent.concat(getFilesContent(fullPath));
        } else {
            filesContent.push(fs.readFileSync(fullPath, 'utf8'));
        }
    });
    return filesContent;
};

console.log('Process Started');
const assets = getAssets(ASSETS_DIR, ASSETS_DIR);

const constantsImages = readConstantsFile();

// Get all file contents including the constants file
const filesContent = getFilesContent(PROJECT_DIR).join(' ');

// Check for unused assets, considering the constants file
const unusedAssets = assets.filter(asset => {
    const baseAssetName = asset.replace(HIGH_RESOLUTION_SUFFIXES, '.'); // Normalize to base name
    return !filesContent.includes(baseAssetName) && !constantsImages.has(baseAssetName);
});

// Include @2x and @3x versions of the unused base assets
const finalUnusedAssets = new Set(unusedAssets);

unusedAssets.forEach(asset => {
    const baseAssetName = asset.replace(HIGH_RESOLUTION_SUFFIXES, '.'); // Normalize to base name

    // Only include @2x and @3x if the base asset is unused
    const highResAssets = [
        baseAssetName.replace(/\.(.+)$/, '@2x.$1'),
        baseAssetName.replace(/\.(.+)$/, '@3x.$1')
    ];

    highResAssets.forEach(highResAsset => {
        if (assets.includes(highResAsset) && !filesContent.includes(highResAsset) && !constantsImages.has(highResAsset)) {
            finalUnusedAssets.add(highResAsset);
        }
    });
});


// Calculate file sizes for unused assets
const unusedAssetsWithSizes = Array.from(finalUnusedAssets).map(asset => {
    const fullPath = path.join(ASSETS_DIR, asset);
    const stats = fs.statSync(fullPath); // Get file stats
    const sizeInMB = (stats.size / SIZE_CONVERSION_FACTOR).toFixed(2); // Size in MB
    return { asset, size: sizeInMB }; // Return an object with asset and size
});

// Calculate total size of unused assets
const totalSize = unusedAssetsWithSizes.reduce((total, { size }) => total + parseFloat(size), 0);

// Write unused assets with sizes to a file
const outputPath = path.join(PROJECT_DIR, '../unused_assets.txt');
const outputContent = unusedAssetsWithSizes.map(({ asset, size }) => `${asset} -- ${size} MB`).join('\n');
const totalSizeLine = `\n\nTotal size of unused assets: ${totalSize.toFixed(2)} MB`;
fs.writeFileSync(outputPath, outputContent + totalSizeLine);

// Log the results
console.log(`Unused assets have been written to ${outputPath}`);
console.log(`Total size of unused assets: ${totalSize.toFixed(2)} MB`); // Total size in MB