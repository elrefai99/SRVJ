import { V4 } from 'paseto'
import { loadPrivateKey } from '../../../utils/loadKey'

export type TokenType = 'access' | 'refresh' | 'forget_password' | 'pending'

export const TOKEN_VERSION = 2

export const token_PASETO = async (payload: any, type: TokenType, expiresIn?: string): Promise<string> => {
  switch (type) {
    case 'access':
      const privateKey = loadPrivateKey('ACCESS_PRIVATE_KEY')
      const token = await V4.sign(
        {
          data: { user_id: payload.data.user_id },
          site: 'SRVJ',
          token_version: TOKEN_VERSION,
          access_device: payload.access_device,
        },
        privateKey,
        { expiresIn: '2d' },
      )
      return token
    case 'refresh':
      const privateKeyRefresh = loadPrivateKey('REFRESH_PRIVATE_KEY')
      const tokenRefresh = await V4.sign(
        {
          data: { user_id: payload.data.user_id },
          site: 'SRVJ',
          token_version: TOKEN_VERSION,
          access_device: payload.access_device,
        },
        privateKeyRefresh,
        { expiresIn: expiresIn || '30d' },
      )
      return tokenRefresh
    case 'forget_password':
      const privateKeyForgetPassword = loadPrivateKey('PRIVATE_FORGET_PASSWORD_SECRET_KY')
      const tokenForgetPassword = await V4.sign(
        {
          data: { user_id: payload.data.user_id },
          site: 'SRVJ',
          token_version: TOKEN_VERSION,
          access_device: payload.access_device,
        },
        privateKeyForgetPassword,
        { expiresIn: '2h' },
      )
      return tokenForgetPassword
    case 'pending':
      const privateKeyPending = loadPrivateKey('PENDING_PRIVATE_KEY')
      const tokenPending = await V4.sign(
        {
          data: { user_id: payload.data.user_id },
          site: 'SRVJ',
          token_version: TOKEN_VERSION,
          access_device: payload.access_device,
        },
        privateKeyPending,
        { expiresIn: '2h' },
      )
      return tokenPending
  }
}
