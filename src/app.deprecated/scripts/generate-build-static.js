#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

globHtmlFiles = () => {
    // Find all HTML files in src/ and src/views/
    const htmlFiles = [];
    const srcDir = 'src';
    const viewsDir = path.join('src', 'views');
    if (fs.existsSync(path.join(srcDir, 'index.html'))) {
        htmlFiles.push(path.join(srcDir, 'index.html'));
    }
    if (fs.existsSync(viewsDir)) {
        for (const file of fs.readdirSync(viewsDir)) {
            if (file.endsWith('.html')) {
                htmlFiles.push(path.join(viewsDir, file));
            }
        }
    }
    return htmlFiles;
};

const findIncludedFiles = (htmlFiles) => {
    const includedFiles = new Set();
    for (const htmlFile of htmlFiles) {
        const content = fs.readFileSync(htmlFile, 'utf8');
        // Find all script and link tags
        const matches = content.match(/<script[^>]+src=['"]([^'"]+)['"]|<link[^>]+href=['"]([^'"]+)['"]/g) || [];
        for (const match of matches) {
            const src = match.match(/src=['"]([^'"]+)['"]/)?.[1] ||
                       match.match(/href=['"]([^'"]+)['"]/)?.[1];
            if (src && src.startsWith('/static/')) {
                // Convert static path to source path and remove query parameters
                const sourcePath = src.replace('/static/', 'src/').split('?')[0];
                if (fs.existsSync(sourcePath)) {
                    includedFiles.add(sourcePath);
                }
            }
        }
    }
    return Array.from(includedFiles);
};

const generateBuildScript = () => {
    const htmlFiles = globHtmlFiles();
    const includedFiles = findIncludedFiles(htmlFiles);
    // Only include HTML files that exist
    const allFiles = [...htmlFiles.filter(f => fs.existsSync(f)), ...includedFiles];
    // Generate rm commands
    const rmCommands = allFiles.map(file => {
        const staticPath = file.replace('src/', '../../static/');
        return `rm -f ${staticPath}`;
    }).join(' && ');
    // Generate cp commands
    const cpCommands = allFiles.map(file => {
        const staticPath = file.replace('src/', '../../static/');
        const dir = path.dirname(staticPath);
        return `cp ${file} ${dir}/`;
    }).join(' && ');
    // Generate verify commands
    const verifyCommands = allFiles.map(file => {
        const staticPath = file.replace('src/', '../../static/');
        return `test -f ${staticPath}`;
    }).join(' && ');
    // Generate the complete script
    const script = `${rmCommands} && ${cpCommands} && ${verifyCommands}`;
    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageJson.scripts['build:static'] = script;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('Generated build:static script in package.json');
};

generateBuildScript(); 