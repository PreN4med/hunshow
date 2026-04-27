import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '500mb' }));
  app.use(urlencoded({ limit: '500mb', extended: true }));
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://fall-capstone-499-group-7.vercel.app',
      'https://hunshow.vercel.app',
    ],
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on ${port}`);
}
bootstrap();
