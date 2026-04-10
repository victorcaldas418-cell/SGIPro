export type ClientType = 'PF' | 'PJ';
export type AssociateRole = 'Sócio' | 'Sócio Administrador' | 'Administrador' | 'Diretor' | 'Presidente';

export interface ClientAssociate {
  id?: number;
  company_id?: number;
  name: string;
  cpf?: string;
  role: AssociateRole;
  person_id?: number | null;
}

export interface Client {
  id?: number;
  type: ClientType;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  status: boolean;

  // Endereço
  zipcode?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // PF
  cpf?: string;
  rg?: string;
  birth_date?: string; // em formato YYYY-MM-DD

  // PJ
  trading_name?: string;
  cnpj?: string;
  state_registration?: string;

  associates?: ClientAssociate[];
}
