import { Types } from 'mongoose';

type StatusEntry = { created_at: Date; name: string };

export type RequestedServiceWithStatus = {
  requested_service_number: number;
  status: StatusEntry[];
};

export type OrderServiceWithRequestedServices = {
  _id: Types.ObjectId;
  createdAt: Date;
  requested_services: number[];
  requested_services_data: RequestedServiceWithStatus[];
  service_order_number: number;
  status: StatusEntry[];
  updatedAt: Date;
};
