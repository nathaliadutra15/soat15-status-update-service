import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentClient } from '../../httpClient/payment.client';
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
    private readonly paymentClient: PaymentClient,
  ) { }

  private async getRequestedServiceStatus(requestedServiceNumber: number): Promise<null | RequestedServicesStatus> {
    const requestedService = await this.RequestedServiceModel.findOne({ requested_service_number: requestedServiceNumber }).exec();
    return requestedService ? requestedService.status[requestedService.status.length - 1].name as RequestedServicesStatus : null;
  }

  private async getRequestedServiceByOrderService(orderServiceNumber: number): Promise<null | RequestedService[]> {
    const requestedServices = await this.RequestedServiceModel.find({ service_order_number: orderServiceNumber }).exec();
    return requestedServices;
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

  async getRequestedServiceStatusHistory(requestedServiceNumber: number): Promise<null | RequestedService> {
    const history = await this.RequestedServiceModel.findOne({ requested_service_number: requestedServiceNumber }).exec();
    return history; 
  }

  async create(requestedService: RequestedServiceDTO) {
    if (RequestedServicesStatus.RECEBIDA === requestedService.status && requestedService.service_order_number) {
      const serviceOrderData = await this.orderServiceClient.getServiceOrder(requestedService.service_order_number);
      const requestedServicesNumbers = serviceOrderData.requestedServices.map((service: any) => service.id);

      await this.serviceOrderUpdateService.orderResponseUpdate(requestedService.service_order_number, ServiceOrderStatus.PENDENTE, requestedServicesNumbers);

      return await this.RequestedServiceModel.insertMany(requestedServicesNumbers.map((serviceNumber: number) => ({
        requested_service_number: serviceNumber,
        service_order_number: requestedService.service_order_number,
        status: [{ created_at: new Date(), name: RequestedServicesStatus.RECEBIDA }],
      })));
    }
  }

  async review(requestedService: RequestedServiceDTO) {
    if (requestedService.requested_service_number) {
      await this.checkPreviousStatus(
        requestedService.requested_service_number,
        RequestedServicesStatus.RECEBIDA,
      );

      if (RequestedServicesStatus.EM_DIAGNOSTICO === requestedService.status) {
        const requestedServiceData = await this.orderServiceClient.getRequestedService(requestedService.requested_service_number);
        if (requestedServiceData.employee && requestedServiceData.serviceOrder.vehicle_arrived_at !== null) {
          return await this.updateStatus(
            requestedService.requested_service_number,
            RequestedServicesStatus.EM_DIAGNOSTICO,
          );
        }
        else {
          throw new BadRequestException('Employee or Vehicle arrived date is not valid.');
        }
      }
    }
  }

  async waiting(requestedService: RequestedServiceDTO) {
    if (requestedService.requested_service_number) {
      await this.checkPreviousStatus(
        requestedService.requested_service_number,
        RequestedServicesStatus.EM_DIAGNOSTICO,
      );

      return RequestedServicesStatus.AGUARDANDO_APROVACAO === requestedService.status
        ? await this.updateStatus(
            requestedService.requested_service_number,
            RequestedServicesStatus.AGUARDANDO_APROVACAO,
          )
        : null;
    }
  }

  async orderResponse(requestedService: RequestedServiceDTO) {
    if (requestedService.requested_service_number) {
      await this.checkPreviousStatus(
        requestedService.requested_service_number,
        RequestedServicesStatus.AGUARDANDO_APROVACAO,
      );

      const newStatus = requestedService.status;

      if (
        newStatus === RequestedServicesStatus.APROVADO
        || newStatus === RequestedServicesStatus.CANCELADO
      ) {
        await this.updateStatus(requestedService.requested_service_number, newStatus);
        await this.serviceOrderUpdateService.orderResponseUpdate(
          requestedService.service_order_number,
          newStatus === RequestedServicesStatus.APROVADO ? ServiceOrderStatus.APROVADO : ServiceOrderStatus.CANCELADO,
        );
      }
    }
  }

  async execution(requestedService: RequestedServiceDTO) {
    if (requestedService.requested_service_number) {
      await this.checkPreviousStatus(
        requestedService.requested_service_number,
        RequestedServicesStatus.APROVADO,
      );

      return RequestedServicesStatus.EM_EXECUCAO === requestedService.status
        ? await this.updateStatus(
            requestedService.requested_service_number,
            RequestedServicesStatus.EM_EXECUCAO,
          )
        : null;
    }
  }

  async finish(requestedService: RequestedServiceDTO) {
    if (requestedService.requested_service_number) {
      await this.checkPreviousStatus(
        requestedService.requested_service_number,
        RequestedServicesStatus.EM_EXECUCAO,
      );
      return RequestedServicesStatus.FINALIZADA === requestedService.status
        ? await this.updateStatus(
            requestedService.requested_service_number,
            RequestedServicesStatus.FINALIZADA,
          )
        : null;
    }
  }

  async deliver(requestedService: RequestedServiceDTO) {
    const paymentStatus = await (await this.paymentClient.getServiceOrderStatus(requestedService.requested_service_number ?? 0)).status;
    if (paymentStatus !== 'processed') {
      throw new BadRequestException('Service order cannot be delivered.');
    };

    if (RequestedServicesStatus.ENTREGUE === requestedService.status && requestedService.service_order_number) {
      const serviceOrder = await this.serviceOrderUpdateService.orderResponseUpdate(requestedService.service_order_number, ServiceOrderStatus.ENTREGUE);

      if (serviceOrder) {
        const requestedServices = await this.getRequestedServiceByOrderService(requestedService.service_order_number) || [];

        for (const requestedServiceData of requestedServices) {
          await this.updateStatus(
            requestedServiceData.requested_service_number,
            RequestedServicesStatus.ENTREGUE,
          );
        }
        return null;
      }
    }

    throw new BadRequestException('Service order cannot be delivered.');
  }
}
