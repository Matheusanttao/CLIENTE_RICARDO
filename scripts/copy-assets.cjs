const fs = require('fs');
const path = require('path');

function lp(p) {
  // Long-path prefix for Windows (works with short names too)
  return p.startsWith('\\\\?\\') ? p : `\\\\?\\${p}`;
}

const projectRoot = path.resolve(__dirname, '..');
const dstAssetsDir = path.join(projectRoot, 'src', 'assets');
const dstPublicDir = path.join(projectRoot, 'public');

fs.mkdirSync(dstAssetsDir, { recursive: true });
fs.mkdirSync(dstPublicDir, { recursive: true });

const srcDir =
  'C:\\Users\\MATHEU~1\\.cursor\\projects\\c-Users-MATHEUS-ANT-O-Desktop-M-PROJETOS-RICARDO\\assets';

const files = [
  {
    src: path.join(
      srcDir,
      'c__Users_MATHEUS-ANT_O_AppData_Roaming_Cursor_User_workspaceStorage_4be1954baf5b5e9300c46883536a998a_images_image-a424501f-afe8-4ab9-ad14-3dba29670d3d.png',
    ),
    dst: path.join(dstAssetsDir, 'logo.png'),
  },
  {
    src: path.join(
      srcDir,
      'c__Users_MATHEUS-ANT_O_AppData_Roaming_Cursor_User_workspaceStorage_4be1954baf5b5e9300c46883536a998a_images_image-c53756d6-4721-4452-9a00-8f91f5da740b.png',
    ),
    dst: path.join(dstAssetsDir, 'ricardo.jpg'),
  },
];

for (const f of files) {
  if (!fs.existsSync(f.src)) {
    console.error(`Missing source file: ${f.src}`);
    process.exitCode = 1;
    continue;
  }
  fs.copyFileSync(lp(f.src), lp(f.dst));
  console.log(`Copied: ${f.dst}`);
}
