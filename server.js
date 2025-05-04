const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(fileUpload());

app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.lottie) {
    return res.status(400).send('No file uploaded.');
  }

  const lottieFile = req.files.lottie;
  const uploadPath = path.join(__dirname, 'public', 'animation.json');

  await lottieFile.mv(uploadPath);

  const width = 1200;
  const height = 1200;
  const frameRate = 30;
  const totalFrames = 91;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; background: transparent; }
        #anim { width: ${width}px; height: ${height}px; }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.10.2/lottie.min.js"></script>
    </head>
    <body>
      <div id="anim"></div>
      <script>
        const animationData = ${fs.readFileSync(uploadPath)};
        const anim = lottie.loadAnimation({
          container: document.getElementById('anim'),
          renderer: 'canvas',
          loop: false,
          autoplay: false,
          animationData
        });
        window.anim = anim;
      </script>
    </body>
    </html>
  `;

  fs.writeFileSync(path.join(__dirname, 'public', 'preview.html'), html);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(`file://${path.join(__dirname, 'public', 'preview.html')}`);

  const framesDir = path.join(__dirname, 'public', 'frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);

  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate((frame) => {
      anim.goToAndStop(frame, true);
    }, i);
    await new Promise(resolve => setTimeout(resolve, 30));
    await page.screenshot({ path: `${framesDir}/frame${String(i).padStart(4, '0')}.png`, omitBackground: true });
  }

  await browser.close();

  const outputMov = path.join(__dirname, 'public', 'output.mov');
  const ffmpegCmd = `ffmpeg -framerate ${frameRate} -i ${framesDir}/frame%04d.png -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -y ${outputMov}`;

  exec(ffmpegCmd, (err, stdout, stderr) => {
    if (err) return res.status(500).send('FFmpeg error: ' + stderr);

    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.rmSync(uploadPath, { force: true });
    fs.rmSync(path.join(__dirname, 'public', 'preview.html'), { force: true });

    res.json({ success: true, url: '/output.mov' });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
