import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.connectMicroservice<MicroserviceOptions>(
    {
      options: {
        queue: configService.get('queue.status'),
        queueOptions: { durable: true },
        urls: [configService.get('queue.rmq_url')],
      },
      transport: Transport.RMQ,
    },
    { inheritAppConfig: true },
  );

  const config = new DocumentBuilder()
    .setTitle('Mecânico - Status')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3003);
};
bootstrap();
