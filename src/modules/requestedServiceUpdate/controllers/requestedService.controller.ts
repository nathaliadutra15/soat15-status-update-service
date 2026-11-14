import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { RequestedServiceDTO } from '../models/requestedService.model';
import { RequestedServiceService } from '../services/requestedServiceUpdate.service';

@Controller()
export class RequestedServiceController {
  constructor(private readonly requestedServiceUpdate: RequestedServiceService) { }

  @Post()
  async requestedServiceCreated(@Body() requestedService: RequestedServiceDTO) {
    switch (requestedService.status.name) {
      case 'RECEBIDA':
        return await this.requestedServiceUpdate.create(requestedService);
      case 'EM DIAGNÓSTICO':
        return await this.requestedServiceUpdate.review(requestedService);
      case 'EM EXECUÇÃO':
        return await this.requestedServiceUpdate.execution(requestedService);
      case 'FINALIZADA':
        return await this.requestedServiceUpdate.finish(requestedService);
      case 'ENTREGUE':
        return await this.requestedServiceUpdate.deliver(requestedService);
      case 'AGUARDANDO APROVAÇÃO':
        return await this.requestedServiceUpdate.waiting(requestedService);
      case 'APROVADO':
      case 'CANCELADO':
        return await this.requestedServiceUpdate.orderResponse(requestedService);
      default:
        throw new BadRequestException(
          `Status ${requestedService.status.name} is not valid for requested service update.`,
        );
    }
  }
}
