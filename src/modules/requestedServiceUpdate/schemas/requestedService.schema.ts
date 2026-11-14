import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestedServiceDocument = HydratedDocument<RequestedService>;

@Schema({ timestamps: true })
export class RequestedService {
  @Prop({ required: true, unique: true })
  requested_service_number: number;

  @Prop({ required: true })
  service_order_number: number;

  @Prop({ required: true })
  status: [{
    created_at: Date;
    name: string;
  }];
}

export const RequestedServiceSchema = SchemaFactory.createForClass(RequestedService);
