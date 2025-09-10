import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ajouter ValidationPipe pour activer la validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non décorées
      forbidNonWhitelisted: true, // Lance une erreur si propriétés non décorées
      transform: true, // Transforme les payloads en instances de classe
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
