import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { FallbackModule } from './modules/fallback/fallback.module';
import { HealthController } from './modules/health/health/health.controller';
import { PaymentClient } from './modules/httpClient/payment.client';
import { ServiceOrderClient } from './modules/httpClient/serviceOrder.client';
import { RequestedServiceController } from './modules/requestedServiceUpdate/controllers/requestedService.controller';
import { RequestedService, RequestedServiceSchema } from './modules/requestedServiceUpdate/schemas/requestedService.schema';
import { RequestedServiceService } from './modules/requestedServiceUpdate/services/requestedServiceUpdate.service';
import { OrderService, OrderServiceSchema } from './modules/serviceOrderUpdate/schemas/serviceOrder.schema';
import { ServiceOrderUpdateService } from './modules/serviceOrderUpdate/services/serviceOrderUpdate.service';
import { RequestedServiceListener } from './modules/requestedServiceUpdate/listener/requestedService.listener';

@Module({
  controllers: [HealthController, RequestedServiceController, RequestedServiceListener],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: RequestedService.name, schema: RequestedServiceSchema },
      { name: OrderService.name, schema: OrderServiceSchema },
    ]),
    AuthModule,
    FallbackModule,
    HttpModule,
  ],
  providers: [RequestedServiceService, ServiceOrderUpdateService, ServiceOrderClient, PaymentClient],
})
export class AppModule { }
