import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderServiceDocument = HydratedDocument<OrderService>;

@Schema({ timestamps: true })
export class OrderService {
  @Prop({ required: true, unique: true })
  service_order_number: number;

  @Prop({ required: true })
  requested_services: number[];

  @Prop({ required: true })
  status: [{
    created_at: Date;
    name: string;
  }];
}

export const OrderServiceSchema = SchemaFactory.createForClass(OrderService);
