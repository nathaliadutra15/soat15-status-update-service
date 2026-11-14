import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderService, OrderServiceDocument } from '../schemas/serviceOrder.schema';
import { ServiceOrderStatus } from '../enums/status.enum';
import { ServiceOrderClient } from '../../httpClient/serviceOrder.client';
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
        { $push: { status: { name: newStatus, created_at: new Date() } } },
      )
      .exec();
  }

  private async createOrderService(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices: number[]) {
    const newOrderService = new this.orderServiceModel({
      service_order_number: orderServiceNumber,
      requested_services: requestedServices,
      status: [{ name: newStatus, created_at: new Date() }],
    });
    return await newOrderService.save();
  }

  async orderResponseUpdate(orderServiceNumber: number, newStatus: ServiceOrderStatus, requestedServices?: number[], serviceOrderId?: number) {
    if (newStatus === ServiceOrderStatus.ENTREGUE && serviceOrderId) {
      const serviceOrder = await this.serviceOrderClient.getServiceOrder(serviceOrderId);
      if (serviceOrder && serviceOrder.requestedServices && serviceOrder.requestedServices.length > 0 && serviceOrder.requestedServices.every(
        (service: any) => service.status === 'ENTREGUE')) {
        await this.updateStatus(orderServiceNumber, newStatus);
      }
    } else {
      return newStatus === ServiceOrderStatus.PENDENTE ? await this.createOrderService(orderServiceNumber, newStatus, requestedServices || []) : await this.updateStatus(orderServiceNumber, newStatus);
    }
  }

}
