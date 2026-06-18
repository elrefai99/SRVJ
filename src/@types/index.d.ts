import { tableStatus } from "../generated/prisma";

export interface IUser {
     id?: number;
     site_id?: string;
     fullname?: string;
     email?: string;
     username?: string | null;
     avatar?: string | null;
     status?: tableStatus;
     createdAt?: any;
}
