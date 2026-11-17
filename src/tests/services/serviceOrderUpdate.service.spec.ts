import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrderClient } from '../../modules/httpClient/serviceOrder.client';
import { RequestedServicesStatus } from '../../modules/requestedServiceUpdate/enums/status.enum';
import { RequestedService } from '../../modules/requestedServiceUpdate/schemas/requestedService.schema';
import { ServiceOrderStatus } from '../../modules/serviceOrderUpdate/enums/status.enum';
import { OrderService } from '../../modules/serviceOrderUpdate/schemas/serviceOrder.schema';
import { ServiceOrderUpdateService } from '../../modules/serviceOrderUpdate/services/serviceOrderUpdate.service';

const mockUpdateOneResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };

const mockOrderWithServices = {
  _id: '665a1b2c3d4e5f6a7b8c9d0e',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [1, 2],
  requested_services_data: [
    { requested_service_number: 1, status: [{ created_at: new Date(), name: RequestedServicesStatus.FINALIZADA }] },
    { requested_service_number: 2, status: [{ created_at: new Date(), name: RequestedServicesStatus.FINALIZADA }] },
  ],
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE }],
  updatedAt: new Date('2026-11-01T00:00:00Z'),
};

const mockOrderPendingWithCancelledServices = {
  _id: '665a1b2c3d4e5f6a7b8c9d0f',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [1, 2],
  requested_services_data: [
    { requested_service_number: 1, status: [{ created_at: new Date(), name: RequestedServicesStatus.CANCELADO }] },
    { requested_service_number: 2, status: [{ created_at: new Date(), name: RequestedServicesStatus.CANCELADO }] },
  ],
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE }],
  updatedAt: new Date('2026-11-01T00:00:00Z'),
};

const mockOrderPendingWithActiveServices = {
  _id: '665a1b2c3d4e5f6a7b8c9d10',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [1, 2],
  requested_services_data: [
    { requested_service_number: 1, status: [{ created_at: new Date(), name: RequestedServicesStatus.RECEBIDA }] },
    { requested_service_number: 2, status: [{ created_at: new Date(), name: RequestedServicesStatus.CANCELADO }] },
  ],
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE }],
  updatedAt: new Date('2026-11-01T00:00:00Z'),
};

const mockOrderNotPending = {
  _id: '665a1b2c3d4e5f6a7b8c9d11',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [1],
  requested_services_data: [
    { requested_service_number: 1, status: [{ created_at: new Date(), name: RequestedServicesStatus.RECEBIDA }] },
  ],
  service_order_number: 42,
  status: [
    { created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE },
    { created_at: new Date('2026-11-02T00:00:00Z'), name: ServiceOrderStatus.APROVADO },
  ],
  updatedAt: new Date('2026-11-02T00:00:00Z'),
};

const mockOrderWithPendingServices = {
  _id: '665a1b2c3d4e5f6a7b8c9d12',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [1, 2],
  requested_services_data: [
    { requested_service_number: 1, status: [{ created_at: new Date(), name: RequestedServicesStatus.FINALIZADA }] },
    { requested_service_number: 2, status: [{ created_at: new Date(), name: RequestedServicesStatus.RECEBIDA }] },
  ],
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE }],
  updatedAt: new Date('2026-11-01T00:00:00Z'),
};

const mockOrderNoRequestedServices = {
  _id: '665a1b2c3d4e5f6a7b8c9d13',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  requested_services: [],
  requested_services_data: [],
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: ServiceOrderStatus.PENDENTE }],
  updatedAt: new Date('2026-11-01T00:00:00Z'),
};

const mockServiceOrderClient = {
  getOrderDetail: jest.fn(),
};

describe('ServiceOrderUpdateService', () => {
  let service: ServiceOrderUpdateService;
  let orderServiceModel: any;
  let requestedServiceModel: any;
  let mockInstance: { save: jest.MockedFunction<any> };

  beforeEach(async () => {
    mockInstance = {
      save: jest.fn() as jest.MockedFunction<any>,
    };

    const mockModel = Object.assign(
      jest.fn().mockImplementation(() => mockInstance),
      {
        findOne: jest.fn() as jest.MockedFunction<any>,
        updateOne: jest.fn() as jest.MockedFunction<any>,
      },
    );

    const mockRequestedServiceModel = {
      find: jest.fn() as jest.MockedFunction<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrderUpdateService,
        { provide: ServiceOrderClient, useValue: mockServiceOrderClient },
        { provide: getModelToken(OrderService.name), useValue: mockModel },
        { provide: getModelToken(RequestedService.name), useValue: mockRequestedServiceModel },
      ],
    }).compile();

    service = module.get<ServiceOrderUpdateService>(ServiceOrderUpdateService);
    orderServiceModel = module.get(getModelToken(OrderService.name));
    requestedServiceModel = module.get(getModelToken(RequestedService.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('orderResponseUpdate', () => {
    describe('ENTREGUE', () => {
      it('should update status and return true when all requested services are FINALIZADA', async () => {
        orderServiceModel.findOne.mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        orderServiceModel.findOne.mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        (orderServiceModel.findOne as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        (orderServiceModel.findOne as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });

        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderWithServices);

        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderWithServices.requested_services_data);

        requestedServiceModel.find.mockReturnValue(findResult);

        const updateOneResult = {
          exec: jest.fn() as jest.MockedFunction<any>,
        };
        (updateOneResult.exec as jest.MockedFunction<any>).mockResolvedValue(mockUpdateOneResult);
        orderServiceModel.updateOne.mockReturnValue(updateOneResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.ENTREGUE);

        expect(result).toBe(true);
        expect(orderServiceModel.updateOne).toHaveBeenCalledWith(
          { service_order_number: 42 },
          expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: ServiceOrderStatus.ENTREGUE }) }) }),
        );
        expect(orderServiceModel.updateOne).toHaveBeenCalledTimes(1);
      });

      it('should return false when not all requested services are FINALIZADA', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderWithPendingServices);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderWithPendingServices.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.ENTREGUE);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });

      it('should return false when order not found', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(null);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const result = await service.orderResponseUpdate(99, ServiceOrderStatus.ENTREGUE);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });

      it('should return false when requested_services_data is empty', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderNoRequestedServices);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue([]);
        requestedServiceModel.find.mockReturnValue(findResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.ENTREGUE);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('APROVADO', () => {
      it('should update status when last status is PENDENTE', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderPendingWithActiveServices);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderPendingWithActiveServices.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const updateOneResult = {
          exec: jest.fn() as jest.MockedFunction<any>,
        };
        (updateOneResult.exec as jest.MockedFunction<any>).mockResolvedValue(mockUpdateOneResult);
        orderServiceModel.updateOne.mockReturnValue(updateOneResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.APROVADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).toHaveBeenCalledWith(
          { service_order_number: 42 },
          expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: ServiceOrderStatus.APROVADO }) }) }),
        );
        expect(orderServiceModel.updateOne).toHaveBeenCalledTimes(1);
      });

      it('should not update status when last status is not PENDENTE', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderNotPending);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderNotPending.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.APROVADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });

      it('should not update when order not found', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(null);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const result = await service.orderResponseUpdate(99, ServiceOrderStatus.APROVADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('CANCELADO', () => {
      it('should update status when last is PENDENTE and all requested services are CANCELADO', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderPendingWithCancelledServices);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderPendingWithCancelledServices.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const updateOneResult = {
          exec: jest.fn() as jest.MockedFunction<any>,
        };
        (updateOneResult.exec as jest.MockedFunction<any>).mockResolvedValue(mockUpdateOneResult);
        orderServiceModel.updateOne.mockReturnValue(updateOneResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.CANCELADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).toHaveBeenCalledWith(
          { service_order_number: 42 },
          expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: ServiceOrderStatus.CANCELADO }) }) }),
        );
        expect(orderServiceModel.updateOne).toHaveBeenCalledTimes(1);
      });

      it('should not update status when not all requested services are CANCELADO', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderPendingWithActiveServices);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderPendingWithActiveServices.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.CANCELADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });

      it('should not update when last status is not PENDENTE', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(mockOrderNotPending);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const findResult = {
          select: jest.fn() as jest.MockedFunction<any>,
        };
        (findResult.select as jest.MockedFunction<any>).mockReturnValue({
          lean: jest.fn() as jest.MockedFunction<any>,
        });
        ((findResult.select as jest.MockedFunction<any>)() as any).lean.mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        (((findResult.select as jest.MockedFunction<any>)() as any).lean() as any).exec.mockResolvedValue(mockOrderNotPending.requested_services_data);
        requestedServiceModel.find.mockReturnValue(findResult);

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.CANCELADO);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('PENDENTE', () => {
      it('should create a new order service and return false', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(null);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        mockInstance.save.mockResolvedValue({
          _id: 'new-id',
          requested_services: [1, 2, 3],
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: ServiceOrderStatus.PENDENTE }],
        });

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.PENDENTE, [1, 2, 3]);

        expect(result).toBe(false);
        expect(orderServiceModel).toHaveBeenCalledWith({
          requested_services: [1, 2, 3],
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: ServiceOrderStatus.PENDENTE }],
        });
      });

      it('should create with empty requested_services when not provided', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(null);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        mockInstance.save.mockResolvedValue({
          _id: 'new-id',
          requested_services: [],
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: ServiceOrderStatus.PENDENTE }],
        });

        const result = await service.orderResponseUpdate(42, ServiceOrderStatus.PENDENTE);

        expect(result).toBe(false);
        expect(orderServiceModel).toHaveBeenCalledWith({
          requested_services: [],
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: ServiceOrderStatus.PENDENTE }],
        });
      });
    });

    describe('other statuses', () => {
      it('should update status for any other status value', async () => {
        const findOneResult = {
          lean: jest.fn() as jest.MockedFunction<any>,
        };
        (findOneResult.lean as jest.MockedFunction<any>).mockReturnValue({
          exec: jest.fn() as jest.MockedFunction<any>,
        });
        ((findOneResult.lean as jest.MockedFunction<any>)() as any).exec.mockResolvedValue(null);
        orderServiceModel.findOne.mockReturnValue(findOneResult);

        const updateOneResult = {
          exec: jest.fn() as jest.MockedFunction<any>,
        };
        (updateOneResult.exec as jest.MockedFunction<any>).mockResolvedValue(mockUpdateOneResult);
        orderServiceModel.updateOne.mockReturnValue(updateOneResult);

        const otherStatus = 'INICIADO' as unknown as ServiceOrderStatus;
        const result = await service.orderResponseUpdate(42, otherStatus);

        expect(result).toBe(false);
        expect(orderServiceModel.updateOne).toHaveBeenCalledWith(
          { service_order_number: 42 },
          expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: otherStatus }) }) }),
        );
        expect(orderServiceModel.updateOne).toHaveBeenCalledTimes(1);
      });
    });
  });
});
