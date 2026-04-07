import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://fall-capstone-499-group-7.vercel.app/',
    ],
    credentials: true,
  });

  await app.listen(5000, '0.0.0.0');
  console.log('Backend running on http://localhost:5000');
}
bootstrap();
