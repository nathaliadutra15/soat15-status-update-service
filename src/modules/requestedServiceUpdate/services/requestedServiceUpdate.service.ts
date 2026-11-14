import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceOrderClient } from '../../httpClient/serviceOrder.client';
import { ServiceOrderStatus } from '../../serviceOrderUpdate/enums/status.enum';
import { ServiceOrderUpdateService } from '../../serviceOrderUpdate/services/serviceOrderUpdate.service';
import { RequestedServicesStatus } from '../enums/status.enum';
import { RequestedServiceDTO } from '../models/requestedService.model';
import { RequestedService, RequestedServiceDocument } from '../schemas/requestedService.schema';

@Injectable()
export class RequestedServiceService {
  constructor(
    @InjectModel(RequestedService.name) private readonly RequestedServiceModel: Model<RequestedServiceDocument>,
    private readonly serviceOrderUpdateService: ServiceOrderUpdateService,
    private readonly orderServiceClient: ServiceOrderClient,
  ) { }

  private async getRequestedServiceStatus(requestedServiceNumber: number): Promise<null | RequestedServicesStatus> {
    const requestedService = await this.RequestedServiceModel.findOne({ requested_service_number: requestedServiceNumber }).exec();
    return requestedService ? requestedService.status[requestedService.status.length - 1].name as RequestedServicesStatus : null;
  }

  private async checkPreviousStatus(requestedServiceNumber: number, expectedStatus: RequestedServicesStatus): Promise<void> {
    const currentStatus = await this.getRequestedServiceStatus(requestedServiceNumber);
    if (currentStatus !== expectedStatus) {
      throw new BadRequestException(
        `Requested Service has status ${currentStatus} but needed status ${expectedStatus}`,
      );
    }
  }

  private async updateStatus(requestedServiceNumber: number, newStatus: RequestedServicesStatus) {
    return this.RequestedServiceModel
      .updateOne(
        { requested_service_number: requestedServiceNumber },
        { $push: { status: { created_at: new Date(), name: newStatus } } },
      )
      .exec();
  }

  async create(requestedService: RequestedServiceDTO) {
    const newRequestedService = new this.RequestedServiceModel({
      requested_service_number: requestedService.requested_service_number,
      service_order_number: requestedService.service_order_number,
      status: [{ created_at: new Date(), name: requestedService.status.name }],
    });

    if (RequestedServicesStatus.RECEBIDA === requestedService.status.name) {
      const requestedServiceData = await this.orderServiceClient.getRequestedService(requestedService.requested_service_number);
      const requestedServicesNumbers = requestedServiceData.serviceOrder.requestedServices.map((service: any) => service.id);

      await this.serviceOrderUpdateService.orderResponseUpdate(requestedService.service_order_number, ServiceOrderStatus.PENDENTE, requestedServicesNumbers);
      return await newRequestedService.save();
    }
  }

  async review(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.RECEBIDA,
    );

    if (RequestedServicesStatus.EM_DIAGNOSTICO === requestedService.status.name) {
      const requestedServiceData = await this.orderServiceClient.getRequestedService(requestedService.requested_service_number);
      if (requestedServiceData.employee && requestedServiceData.serviceOrder.vehicle_arrived_at !== null) {
        return await this.updateStatus(
          requestedService.requested_service_number,
          RequestedServicesStatus.EM_DIAGNOSTICO,
        );
      }
    }
  }

  async waiting(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.EM_DIAGNOSTICO,
    );

    return RequestedServicesStatus.AGUARDANDO_APROVACAO === requestedService.status.name
      ? await this.updateStatus(
          requestedService.requested_service_number,
          RequestedServicesStatus.AGUARDANDO_APROVACAO,
        )
      : null;
  }

  async orderResponse(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.AGUARDANDO_APROVACAO,
    );

    const newStatus = requestedService.status.name;

    if (
      newStatus === RequestedServicesStatus.APROVADO
      || newStatus === RequestedServicesStatus.CANCELADO
    ) {
      await this.serviceOrderUpdateService.orderResponseUpdate(
        requestedService.service_order_number,
        newStatus === RequestedServicesStatus.APROVADO ? ServiceOrderStatus.APROVADO : ServiceOrderStatus.CANCELADO,
      );
      return await this.updateStatus(requestedService.requested_service_number, newStatus);
    }
  }

  async execution(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.APROVADO,
    );

    return RequestedServicesStatus.EM_EXECUCAO === requestedService.status.name
      ? await this.updateStatus(
          requestedService.requested_service_number,
          RequestedServicesStatus.EM_EXECUCAO,
        )
      : null;
  }

  async finish(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.EM_EXECUCAO,
    );
    return RequestedServicesStatus.FINALIZADA === requestedService.status.name
      ? await this.updateStatus(
          requestedService.requested_service_number,
          RequestedServicesStatus.FINALIZADA,
        )
      : null;
  }

  async deliver(requestedService: RequestedServiceDTO) {
    await this.checkPreviousStatus(
      requestedService.requested_service_number,
      RequestedServicesStatus.FINALIZADA,
    );

    if (RequestedServicesStatus.ENTREGUE === requestedService.status.name) {
      await this.serviceOrderUpdateService.orderResponseUpdate(requestedService.service_order_number, ServiceOrderStatus.ENTREGUE, undefined, requestedService.service_order_number);
      return await this.updateStatus(requestedService.requested_service_number, RequestedServicesStatus.ENTREGUE);
    }
  }
}
