export interface StandardResponse<T = any> {
  message: string;
  data: T;
}

export interface StandardListResponse<T = any> {
  message: string;
  data: {
    items: T[];
    count: number;
  };
}

export interface StandardCreateResponse<T = any> {
  message: string;
  data: {
    id: string;
    entity: T;
  };
}

export interface StandardDeleteResponse {
  message: string;
  data: {
    id: string;
  };
}
