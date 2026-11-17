import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { RequestedServicesStatus } from '../enums/status.enum';
import { RequestedServiceDTO } from '../models/requestedService.model';
import { RequestedServiceService } from '../services/requestedServiceUpdate.service';

export const REQUESTED_SERVICE_STATUS_PATTERN = 'requested-service.status';

@Controller()
export class RequestedServiceListener {
  private readonly logger = new Logger(RequestedServiceListener.name);

  constructor(private readonly requestedServiceUpdate: RequestedServiceService) { }

  @EventPattern(REQUESTED_SERVICE_STATUS_PATTERN)
  async handleStatusUpdate(@Payload() payload: unknown, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      const requestedService = plainToInstance(RequestedServiceDTO, payload);
      await validateOrReject(requestedService);

      await this.dispatch(requestedService);

      channel.ack(message);
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Failed to process status update ${JSON.stringify(payload)}: ${reason}`);

      channel.nack(message, false, false);
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
        throw new Error(`Status ${requestedService.status} is not valid for requested service update.`);
    }
  }
}
