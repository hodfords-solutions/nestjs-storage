import { AzureAccountType, S3AccountType } from './account.type.js';

export type StorageOptions =
    | {
          account: AzureAccountType;
          disk: 'azure';
      }
    | { account: S3AccountType; disk: 's3' };
