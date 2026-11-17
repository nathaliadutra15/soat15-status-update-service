import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupDeadLetterTopology, STATUS_QUEUE_OPTIONS } from './config/rabbitmq.config';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const rmqUrl = process.env.RMQ_URL ?? 'amqp://localhost:5672';

  await setupDeadLetterTopology(rmqUrl);

  app.connectMicroservice<MicroserviceOptions>({
    options: {
      noAck: false,
      prefetchCount: 1,
      queue: process.env.STATUS_QUEUE_NAME,
      queueOptions: STATUS_QUEUE_OPTIONS,
      urls: [rmqUrl],
    },
    transport: Transport.RMQ,
  });

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
