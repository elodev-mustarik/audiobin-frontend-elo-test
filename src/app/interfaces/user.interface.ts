export interface IUser {
  id?: number;
  username?: string;
  email: string;
  phone?: string;
  token?: string;
}

export interface Member {
  id: number;
  email: string;
  name: string;
  accepted: boolean;
}


