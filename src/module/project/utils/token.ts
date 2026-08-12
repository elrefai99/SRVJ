import jwt from "jsonwebtoken";

export const INVITE_TOKEN = process.env.INVITE_TOKEN as string;

export const inviteToken = (paylaod: any) => {
     return jwt.sign({ site_id: paylaod.id, email: paylaod.email }, INVITE_TOKEN, { expiresIn: "6h", algorithm: 'HS256' });
};
