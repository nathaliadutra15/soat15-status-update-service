import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentClient } from '../../modules/httpClient/payment.client';
import { ServiceOrderClient } from '../../modules/httpClient/serviceOrder.client';
import { RequestedServicesStatus } from '../../modules/requestedServiceUpdate/enums/status.enum';
import { RequestedServiceDTO } from '../../modules/requestedServiceUpdate/models/requestedService.model';
import { RequestedService } from '../../modules/requestedServiceUpdate/schemas/requestedService.schema';
import { RequestedServiceService } from '../../modules/requestedServiceUpdate/services/requestedServiceUpdate.service';
import { ServiceOrderStatus } from '../../modules/serviceOrderUpdate/enums/status.enum';
import { ServiceOrderUpdateService } from '../../modules/serviceOrderUpdate/services/serviceOrderUpdate.service';

const mockUpdateOneResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };

const mockRequestedService = {
  _id: '665a1b2c3d4e5f6a7b8c9d0e',
  requested_service_number: 1,
  service_order_number: 42,
  status: [{ created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA }],
};

const mockRequestedServiceEmDiagnostico = {
  _id: '665a1b2c3d4e5f6a7b8c9d0f',
  requested_service_number: 1,
  service_order_number: 42,
  status: [
    { created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA },
    { created_at: new Date('2026-11-02T00:00:00Z'), name: RequestedServicesStatus.EM_DIAGNOSTICO },
  ],
};

const mockRequestedServiceAguardando = {
  _id: '665a1b2c3d4e5f6a7b8c9d10',
  requested_service_number: 1,
  service_order_number: 42,
  status: [
    { created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA },
    { created_at: new Date('2026-11-02T00:00:00Z'), name: RequestedServicesStatus.EM_DIAGNOSTICO },
    { created_at: new Date('2026-11-03T00:00:00Z'), name: RequestedServicesStatus.AGUARDANDO_APROVACAO },
  ],
};

const mockRequestedServiceAprovado = {
  _id: '665a1b2c3d4e5f6a7b8c9d11',
  requested_service_number: 1,
  service_order_number: 42,
  status: [
    { created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA },
    { created_at: new Date('2026-11-02T00:00:00Z'), name: RequestedServicesStatus.EM_DIAGNOSTICO },
    { created_at: new Date('2026-11-03T00:00:00Z'), name: RequestedServicesStatus.AGUARDANDO_APROVACAO },
    { created_at: new Date('2026-11-04T00:00:00Z'), name: RequestedServicesStatus.APROVADO },
  ],
};

const mockRequestedServiceEmExecucao = {
  _id: '665a1b2c3d4e5f6a7b8c9d12',
  requested_service_number: 1,
  service_order_number: 42,
  status: [
    { created_at: new Date('2026-11-01T00:00:00Z'), name: RequestedServicesStatus.RECEBIDA },
    { created_at: new Date('2026-11-02T00:00:00Z'), name: RequestedServicesStatus.EM_DIAGNOSTICO },
    { created_at: new Date('2026-11-03T00:00:00Z'), name: RequestedServicesStatus.AGUARDANDO_APROVACAO },
    { created_at: new Date('2026-11-04T00:00:00Z'), name: RequestedServicesStatus.APROVADO },
    { created_at: new Date('2026-11-05T00:00:00Z'), name: RequestedServicesStatus.EM_EXECUCAO },
  ],
};

const mockServiceOrderClient = {
  getRequestedService: jest.fn() as jest.MockedFunction<any>,
  getServiceOrder: jest.fn() as jest.MockedFunction<any>,
};

const mockPaymentClient = {
  getServiceOrderStatus: jest.fn() as jest.MockedFunction<any>,
};

const mockServiceOrderUpdateService = {
  orderResponseUpdate: jest.fn() as jest.MockedFunction<any>,
};

describe('RequestedServiceService', () => {
  let service: RequestedServiceService;
  let requestedServiceModel: any;

  beforeEach(async () => {
    const mockModel = Object.assign(
      jest.fn(),
      {
        find: jest.fn() as jest.MockedFunction<any>,
        findOne: jest.fn() as jest.MockedFunction<any>,
        insertMany: jest.fn() as jest.MockedFunction<any>,
        updateOne: jest.fn() as jest.MockedFunction<any>,
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestedServiceService,
        { provide: getModelToken(RequestedService.name), useValue: mockModel },
        { provide: ServiceOrderUpdateService, useValue: mockServiceOrderUpdateService },
        { provide: ServiceOrderClient, useValue: mockServiceOrderClient },
        { provide: PaymentClient, useValue: mockPaymentClient },
      ],
    }).compile();

    service = module.get<RequestedServiceService>(RequestedServiceService);
    requestedServiceModel = module.get(getModelToken(RequestedService.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequestedServiceStatusHistory', () => {
    it('should return the requested service with status history', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const result = await service.getRequestedServiceStatusHistory(1);

      expect(requestedServiceModel.findOne).toHaveBeenCalledWith({ requested_service_number: 1 });
      expect(result).toEqual(mockRequestedService);
    });

    it('should return null when not found', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(null);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const result = await service.getRequestedServiceStatusHistory(99);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createDto: RequestedServiceDTO = {
      service_order_number: 42,
      status: RequestedServicesStatus.RECEBIDA,
    } as any;

    it('should create requested services and update order status', async () => {
      mockServiceOrderClient.getServiceOrder.mockResolvedValue({
        requestedServices: [{ id: 1 }, { id: 2 }],
      });
      mockServiceOrderUpdateService.orderResponseUpdate.mockResolvedValue(false);
      requestedServiceModel.insertMany.mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]);

      const result = await service.create(createDto);

      expect(mockServiceOrderClient.getServiceOrder).toHaveBeenCalledWith(42);
      expect(mockServiceOrderUpdateService.orderResponseUpdate).toHaveBeenCalledWith(
        42,
        ServiceOrderStatus.PENDENTE,
        [1, 2],
      );
      expect(requestedServiceModel.insertMany).toHaveBeenCalledWith([
        {
          requested_service_number: 1,
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: RequestedServicesStatus.RECEBIDA }],
        },
        {
          requested_service_number: 2,
          service_order_number: 42,
          status: [{ created_at: expect.any(Date), name: RequestedServicesStatus.RECEBIDA }],
        },
      ]);
      expect(result).toEqual([{ _id: 'a' }, { _id: 'b' }]);
    });

    it('should return undefined when status is not RECEBIDA', async () => {
      const result = await service.create({ status: RequestedServicesStatus.APROVADO } as any);

      expect(result).toBeUndefined();
      expect(mockServiceOrderClient.getServiceOrder).not.toHaveBeenCalled();
    });

    it('should return undefined when service_order_number is missing', async () => {
      const result = await service.create({ status: RequestedServicesStatus.RECEBIDA } as any);

      expect(result).toBeUndefined();
      expect(mockServiceOrderClient.getServiceOrder).not.toHaveBeenCalled();
    });
  });

  describe('review', () => {
    it('should update status to EM_DIAGNOSTICO when conditions are met', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      mockServiceOrderClient.getRequestedService.mockResolvedValue({
        employee: { id: 1 },
        serviceOrder: { vehicle_arrived_at: new Date() },
      });

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_DIAGNOSTICO,
      } as any;

      await service.review(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.EM_DIAGNOSTICO }) }) }),
      );
    });

    it('should throw when employee is missing', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      mockServiceOrderClient.getRequestedService.mockResolvedValue({
        employee: null,
        serviceOrder: { vehicle_arrived_at: new Date() },
      });

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_DIAGNOSTICO,
      } as any;

      await expect(service.review(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw when vehicle_arrived_at is null', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      mockServiceOrderClient.getRequestedService.mockResolvedValue({
        employee: { id: 1 },
        serviceOrder: { vehicle_arrived_at: null },
      });

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_DIAGNOSTICO,
      } as any;

      await expect(service.review(dto)).rejects.toThrow('Employee or Vehicle arrived date is not valid.');
    });

    it('should throw when current status is not RECEBIDA', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceEmDiagnostico);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_DIAGNOSTICO,
      } as any;

      await expect(service.review(dto)).rejects.toThrow(BadRequestException);
    });

    it('should return undefined when requested_service_number is missing', async () => {
      const result = await service.review({ status: RequestedServicesStatus.EM_DIAGNOSTICO } as any);

      expect(result).toBeUndefined();
    });
  });

  describe('waiting', () => {
    it('should update status to AGUARDANDO_APROVACAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceEmDiagnostico);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.AGUARDANDO_APROVACAO,
      } as any;

      await service.waiting(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.AGUARDANDO_APROVACAO }) }) }),
      );
    });

    it('should return null when status is not AGUARDANDO_APROVACAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceEmDiagnostico);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.RECEBIDA,
      } as any;

      const result = await service.waiting(dto);

      expect(result).toBeNull();
      expect(requestedServiceModel.updateOne).not.toHaveBeenCalled();
    });

    it('should throw when current status is not EM_DIAGNOSTICO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.AGUARDANDO_APROVACAO,
      } as any;

      await expect(service.waiting(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('orderResponse', () => {
    it('should update to APROVADO and call serviceOrderUpdateService', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceAguardando);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      mockServiceOrderUpdateService.orderResponseUpdate.mockResolvedValue(false);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.APROVADO,
      } as any;

      await service.orderResponse(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.APROVADO }) }) }),
      );
      expect(mockServiceOrderUpdateService.orderResponseUpdate).toHaveBeenCalledWith(42, ServiceOrderStatus.APROVADO);
    });

    it('should update to CANCELADO and call serviceOrderUpdateService', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceAguardando);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      mockServiceOrderUpdateService.orderResponseUpdate.mockResolvedValue(false);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.CANCELADO,
      } as any;

      await service.orderResponse(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.CANCELADO }) }) }),
      );
      expect(mockServiceOrderUpdateService.orderResponseUpdate).toHaveBeenCalledWith(42, ServiceOrderStatus.CANCELADO);
    });

    it('should throw when current status is not AGUARDANDO_APROVACAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.APROVADO,
      } as any;

      await expect(service.orderResponse(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('execution', () => {
    it('should update status to EM_EXECUCAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceAprovado);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_EXECUCAO,
      } as any;

      await service.execution(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.EM_EXECUCAO }) }) }),
      );
    });

    it('should return null when status is not EM_EXECUCAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceAprovado);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.FINALIZADA,
      } as any;

      const result = await service.execution(dto);

      expect(result).toBeNull();
      expect(requestedServiceModel.updateOne).not.toHaveBeenCalled();
    });

    it('should throw when current status is not APROVADO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.EM_EXECUCAO,
      } as any;

      await expect(service.execution(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('finish', () => {
    it('should update status to FINALIZADA', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceEmExecucao);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.FINALIZADA,
      } as any;

      await service.finish(dto);

      expect(requestedServiceModel.updateOne).toHaveBeenCalledWith(
        { requested_service_number: 1 },
        expect.objectContaining({ $push: expect.objectContaining({ status: expect.objectContaining({ name: RequestedServicesStatus.FINALIZADA }) }) }),
      );
    });

    it('should return null when status is not FINALIZADA', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedServiceEmExecucao);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.ENTREGUE,
      } as any;

      const result = await service.finish(dto);

      expect(result).toBeNull();
      expect(requestedServiceModel.updateOne).not.toHaveBeenCalled();
    });

    it('should throw when current status is not EM_EXECUCAO', async () => {
      const findOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findOneResult.exec.mockResolvedValue(mockRequestedService);
      requestedServiceModel.findOne.mockReturnValue(findOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        status: RequestedServicesStatus.FINALIZADA,
      } as any;

      await expect(service.finish(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deliver', () => {
    it('should deliver when payment is processed and all services are finalized', async () => {
      mockPaymentClient.getServiceOrderStatus.mockResolvedValue({ status: 'processed' });
      mockServiceOrderUpdateService.orderResponseUpdate.mockResolvedValue(true);

      const findResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      findResult.exec.mockResolvedValue([
        { requested_service_number: 1, status: [{ name: RequestedServicesStatus.FINALIZADA }] },
        { requested_service_number: 2, status: [{ name: RequestedServicesStatus.FINALIZADA }] },
      ]);
      requestedServiceModel.find.mockReturnValue(findResult);

      const updateOneResult = {
        exec: jest.fn() as jest.MockedFunction<any>,
      };
      updateOneResult.exec.mockResolvedValue(mockUpdateOneResult);
      requestedServiceModel.updateOne.mockReturnValue(updateOneResult);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.ENTREGUE,
      } as any;

      const result = await service.deliver(dto);

      expect(mockPaymentClient.getServiceOrderStatus).toHaveBeenCalledWith(1);
      expect(mockServiceOrderUpdateService.orderResponseUpdate).toHaveBeenCalledWith(42, ServiceOrderStatus.ENTREGUE);
      expect(requestedServiceModel.updateOne).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('should throw when payment is not processed', async () => {
      mockPaymentClient.getServiceOrderStatus.mockResolvedValue({ status: 'created' });

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.ENTREGUE,
      } as any;

      await expect(service.deliver(dto)).rejects.toThrow('Service order cannot be delivered.');
    });

    it('should throw when orderResponseUpdate returns false', async () => {
      mockPaymentClient.getServiceOrderStatus.mockResolvedValue({ status: 'processed' });
      mockServiceOrderUpdateService.orderResponseUpdate.mockResolvedValue(false);

      const dto: RequestedServiceDTO = {
        requested_service_number: 1,
        service_order_number: 42,
        status: RequestedServicesStatus.ENTREGUE,
      } as any;

      await expect(service.deliver(dto)).rejects.toThrow('Service order cannot be delivered.');
    });
  });
});
