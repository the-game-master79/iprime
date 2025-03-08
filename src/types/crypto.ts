export interface CryptoMethod {
  id: string;
  name: string;
  symbol: string;
  image_url: string;
  is_active: boolean;
  qr_code_url: string;
}

export interface CryptoWithPrice extends CryptoMethod {
  current_price: number;
}
