import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceOrderClient } from '../../httpClient/serviceOrder.client';
import { ServiceOrderStatus } from '../enums/status.enum';
import { OrderService, OrderServiceDocument } from '../schemas/serviceOrder.schema';

@Injectable()
export class ServiceOrderUpdateService {
  constructor(
    @InjectModel(OrderService.name) private readonly orderServiceModel: Model<OrderServiceDocument>,
    private readonly serviceOrderClient: ServiceOrderClient,
  ) { }

  private async updateStatus(orderServiceNumber: number, newStatus: ServiceOrderStatus) {
    return this.orderServiceModel
      .updateOne(
        { service_order_number: orderServiceNumber },
        { $push: { status: { created_at: new Date(), name: newStatus } } },
      )
      .exec();
  }

  private async createOrderService(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices: number[]) {
    const newOrderService = new this.orderServiceModel({
      requested_services: requestedServices,
      service_order_number: orderServiceNumber,
      status: [{ created_at: new Date(), name: newStatus }],
    });
    return await newOrderService.save();
  }

  async orderResponseUpdate(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices?: number[], serviceOrderId?: number) {
    if (newStatus === ServiceOrderStatus.ENTREGUE && serviceOrderId) {
      const serviceOrder = await this.serviceOrderClient.getServiceOrder(serviceOrderId);
      if (serviceOrder && serviceOrder.requestedServices && serviceOrder.requestedServices.length > 0 && serviceOrder.requestedServices.every(
        (service: any) => service.status === 'ENTREGUE',
      )) {
        await this.updateStatus(orderServiceNumber, newStatus);
      }
    }
    else {
      return newStatus === ServiceOrderStatus.PENDENTE ? await this.createOrderService(orderServiceNumber, newStatus, requestedServices || []) : await this.updateStatus(orderServiceNumber, newStatus);
    }
  }
}
