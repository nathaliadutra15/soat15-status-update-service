import { BadRequestException, Controller, HttpException, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Model } from 'mongoose';
import { STATUS_EVENT_PATTERN } from '../../../config/rabbitmq.config';
import { RequestedServicesStatus } from '../enums/status.enum';
import { RequestedServiceDTO } from '../models/requestedService.model';
import { ProcessedMessage, ProcessedMessageDocument } from '../schemas/processedMessage.schema';
import { RequestedServiceService } from '../services/requestedServiceUpdate.service';

const RETRY_DELAY_MS = 2000;
const MONGO_DUPLICATE_KEY = 11000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Controller()
export class RequestedServiceListener {
  private readonly logger = new Logger(RequestedServiceListener.name);

  constructor(
    private readonly requestedServiceUpdate: RequestedServiceService,
    @InjectModel(ProcessedMessage.name) private readonly processedModel: Model<ProcessedMessageDocument>,
  ) { }

  @EventPattern(STATUS_EVENT_PATTERN)
  async handleStatusUpdate(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const messageId: string | undefined = message.properties?.messageId;
    const deliveryCount = message.properties?.headers?.['x-delivery-count'] ?? 0;

    try {
      if (messageId && await this.processedModel.exists({ message_id: messageId })) {
        this.logger.warn(`Duplicate message ${messageId} ignored`);
        channel.ack(message);
        return;
      }

      const requestedService = plainToInstance(RequestedServiceDTO, payload);
      await validateOrReject(requestedService);
      await this.dispatch(requestedService);

      if (messageId)
        await this.markAsProcessed(messageId);

      channel.ack(message);
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : JSON.stringify(error);
      const permanent = this.isPermanentError(error);
      this.logger.error(
        `Failed to process ${JSON.stringify(payload)} (messageId=${messageId}, deliveries=${deliveryCount}, ${permanent ? 'permanent' : 'transient'}): ${reason}`,
      );

      if (permanent) {
        channel.nack(message, false, false);
      }
      else {
        await sleep(RETRY_DELAY_MS);
        channel.nack(message, false, true);
      }
    }
  }

  private isPermanentError(error: unknown): boolean {
    if (Array.isArray(error))
      return true;

    if (error instanceof HttpException)
      return error.getStatus() < 500;

    return false;
  }

  private async markAsProcessed(messageId: string) {
    try {
      await this.processedModel.create({ message_id: messageId });
    }
    catch (error: any) {
      if (error?.code !== MONGO_DUPLICATE_KEY)
        throw error;
    }
  }

  private async dispatch(requestedService: RequestedServiceDTO) {
    switch (requestedService.status) {
      case RequestedServicesStatus.RECEBIDA:
        return await this.requestedServiceUpdate.create(requestedService);
      case RequestedServicesStatus.EM_DIAGNOSTICO:
        return await this.requestedServiceUpdate.review(requestedService);
      case RequestedServicesStatus.AGUARDANDO_APROVACAO:
        return await this.requestedServiceUpdate.waiting(requestedService);
      case RequestedServicesStatus.APROVADO:
      case RequestedServicesStatus.CANCELADO:
        return await this.requestedServiceUpdate.orderResponse(requestedService);
      case RequestedServicesStatus.EM_EXECUCAO:
        return await this.requestedServiceUpdate.execution(requestedService);
      case RequestedServicesStatus.FINALIZADA:
        return await this.requestedServiceUpdate.finish(requestedService);
      case RequestedServicesStatus.ENTREGUE:
        return await this.requestedServiceUpdate.deliver(requestedService);
      default:
        throw new BadRequestException(
          `Status ${requestedService.status} is not valid for requested service update.`,
        );
    }
  }
}
