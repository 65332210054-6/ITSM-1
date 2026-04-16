import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const files = [
    'public/assets/js/app.js',
    'public/users.html',
    'public/assets.html',
    'public/tickets.html',
    'public/index.html'
];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.js')) {
        try {
            console.log(`Checking ${file}...`);
            execSync(`node -c ${file}`);
            console.log(`- ${file} is OK`);
        } catch (e) {
            console.error(`- ${file} has SYNTAX ERROR`);
        }
    } else {
        console.log(`Checking scripts in ${file}...`);
        const scripts = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/g);
        if (scripts) {
            scripts.forEach((script, i) => {
                const js = script.replace(/<script\b[^>]*>/, '').replace(/<\/script>/, '').trim();
                if (!js || script.includes('src=')) return;
                
                const tmpFile = `scratch/tmp_script_${path.basename(file)}_${i}.js`;
                fs.writeFileSync(tmpFile, js);
                try {
                    execSync(`node -c ${tmpFile}`);
                    // console.log(`  - Script ${i} is OK`);
                } catch (e) {
                    console.error(`  - Script ${i} in ${file} has SYNTAX ERROR:`);
                    console.error(e.stdout.toString() || e.stderr.toString());
                }
                // fs.unlinkSync(tmpFile);
            });
        }
    }
});
