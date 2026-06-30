import jwt from 'jsonwebtoken'

interface IPayload {
     email: string
     expiresIn: string
     device: string
     uuid: string
}

export function forgetPasswordToken(payload: IPayload) {
     const SECRET_KEY = process.env.PENDING_PUBLIC_KEY as string;
     return jwt.sign(payload, SECRET_KEY, { expiresIn: "5m" });
}
