import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceOrderClient } from '../../httpClient/serviceOrder.client';
import { ServiceOrderStatus } from '../enums/status.enum';
import { OrderService, OrderServiceDocument } from '../schemas/serviceOrder.schema';
import { RequestedService, RequestedServiceDocument } from '../../requestedServiceUpdate/schemas/requestedService.schema';
import { RequestedServicesStatus } from '../../requestedServiceUpdate/enums/status.enum';
import { OrderServiceWithRequestedServices, RequestedServiceWithStatus } from '../models/orderService.model';

@Injectable()
export class ServiceOrderUpdateService {
  constructor(
    @InjectModel(OrderService.name) private readonly OrderServiceModel: Model<OrderServiceDocument>,
    @InjectModel(RequestedService.name) private readonly RequestedServiceModel: Model<RequestedServiceDocument>,
    private readonly serviceOrderClient: ServiceOrderClient,
  ) { }

  private async updateStatus(orderServiceNumber: number, newStatus: ServiceOrderStatus) {
    return this.OrderServiceModel
      .updateOne(
        { service_order_number: orderServiceNumber },
        { $push: { status: { created_at: new Date(), name: newStatus } } },
      )
      .exec();
  }

  private async findOrderWithRequestedServices(serviceOrderNumber: number,): Promise<OrderServiceWithRequestedServices | null> {
    const order = await this.OrderServiceModel
      .findOne({ service_order_number: serviceOrderNumber })
      .lean<OrderService & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }>()
      .exec();

    if (!order) return null;

    const requestedServices = await this.RequestedServiceModel
      .find({ service_order_number: serviceOrderNumber })
      .select('requested_service_number status -_id')
      .lean<RequestedServiceWithStatus[]>()
      .exec();

    return { ...order, requested_services_data: requestedServices };
  }

  private async createOrderService(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices: number[]) {
    const newOrderService = new this.OrderServiceModel({
      requested_services: requestedServices,
      service_order_number: orderServiceNumber,
      status: [{ created_at: new Date(), name: newStatus }],
    });
    return await newOrderService.save();
  }

  async orderResponseUpdate(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices?: number[]) {
    const serviceOrderFull = await this.findOrderWithRequestedServices(orderServiceNumber);

    if (newStatus === ServiceOrderStatus.ENTREGUE && orderServiceNumber) {
      if (serviceOrderFull && serviceOrderFull.requested_services_data && serviceOrderFull.requested_services_data.length > 0 && serviceOrderFull.requested_services_data.every(
        (service) => service.status[service.status.length - 1].name === RequestedServicesStatus.FINALIZADA,
      )) {
        await this.updateStatus(orderServiceNumber, newStatus);
        return true;
      }
      return false;
    }
    if (newStatus === ServiceOrderStatus.APROVADO || newStatus === ServiceOrderStatus.CANCELADO) {
      const last_status = serviceOrderFull?.status[serviceOrderFull.status.length - 1].name;
      const checkCancelledRequestedServices = serviceOrderFull?.requested_services_data.every(
        (service) => service.status[service.status.length - 1].name === RequestedServicesStatus.CANCELADO,
      );

      if (last_status === ServiceOrderStatus.PENDENTE &&
        ((newStatus === ServiceOrderStatus.CANCELADO && checkCancelledRequestedServices) ||
          (newStatus === ServiceOrderStatus.APROVADO))) {
        await this.updateStatus(orderServiceNumber, newStatus);
      }
      return false;
    }

    if (newStatus === ServiceOrderStatus.PENDENTE) {
      await this.createOrderService(orderServiceNumber, newStatus, requestedServices || []);
      return false;
    }

    await this.updateStatus(orderServiceNumber, newStatus);
    return false;
  }
}
