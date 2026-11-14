import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { FallbackModule } from './modules/fallback/fallback.module';
import { HealthController } from './modules/health/health/health.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestedService, RequestedServiceSchema } from './modules/requestedServiceUpdate/schemas/requestedService.schema';
import { OrderService, OrderServiceSchema } from './modules/serviceOrderUpdate/schemas/serviceOrder.schema';
import { RequestedServiceController } from './modules/requestedServiceUpdate/controllers/requestedService.controller';
import { RequestedServiceService } from './modules/requestedServiceUpdate/services/requestedServiceUpdate.service';
import { ServiceOrderUpdateService } from './modules/serviceOrderUpdate/services/serviceOrderUpdate.service';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { ServiceOrderClient } from './modules/httpClient/serviceOrder.client';

@Module({
  controllers: [HealthController, RequestedServiceController],
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
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
  providers: [RequestedServiceService, ServiceOrderUpdateService, ServiceOrderClient],
})
export class AppModule { }
