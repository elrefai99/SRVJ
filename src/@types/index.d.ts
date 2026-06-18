import { tableStatus } from "../generated/prisma";

export interface IUser {
     id?: number;
     site_id?: string;
     fullname?: string;
     email?: string;
     username?: string;
     avatar?: string;
     status?: tableStatus;
     createdAt?: any;
}
