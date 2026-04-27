import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function transcodeToCompatibleMp4(
  inputBuffer: Buffer,
  originalName: string,
): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcode-'));
  const ext = path.extname(originalName) || '.mp4';
  const inputPath = path.join(tmpDir, `input${ext}`);
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-c:a aac',
          '-b:a 128k',
          '-ac 2',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    return fs.readFileSync(outputPath);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // temp cleanup
    }
  }
}
