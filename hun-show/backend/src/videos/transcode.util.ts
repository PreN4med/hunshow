import ffmpeg = require('fluent-ffmpeg');

export async function transcodeToCompatibleMp4Path(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset superfast',
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
}
