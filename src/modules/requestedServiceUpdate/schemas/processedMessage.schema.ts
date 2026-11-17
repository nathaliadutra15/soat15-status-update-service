import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProcessedMessageDocument = HydratedDocument<ProcessedMessage>;

@Schema({ timestamps: true })
export class ProcessedMessage {
  @Prop({ required: true, unique: true })
  message_id: string;
}

export const ProcessedMessageSchema = SchemaFactory.createForClass(ProcessedMessage);

ProcessedMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });